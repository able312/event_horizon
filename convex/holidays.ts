import { ConvexError, v } from "convex/values"

import { normalizeMonthParam, shiftMonthParam } from "../src/lib/months"
import type { HolidayMonth } from "../src/definitions/holidays"
import { internal } from "./_generated/api"
import { internalAction, internalMutation, internalQuery, type ActionCtx, type QueryCtx } from "./_generated/server"
import { companyQuery } from "./lib/auth"
import {
  HOLIDAY_SOURCE,
  HolidayFeedError,
  checkReplacement,
  entriesBetween,
  fetchHolidayFeedText,
  parseHolidayFeed,
  sameEntries,
} from "./lib/holidayFeed"
import { holidayEntry } from "./lib/validators"

// Shared, read-only Canadian holidays for the calendar, cached from Google's public
// feed. Only internal functions write: the weekly cron (crons.ts), the one-time
// bootstrap and the operator refresh. Every client reads the cache; none of them
// contacts Google. A failed refresh never clears the cache.

const refreshOutcome = v.object({
  status: v.union(v.literal("updated"), v.literal("unchanged"), v.literal("failed"), v.literal("superseded")),
  message: v.optional(v.string()),
})
type RefreshOutcome = { status: "updated" | "unchanged" | "failed" | "superseded"; message?: string }

function getCache(ctx: Pick<QueryCtx, "db">) {
  return ctx.db.query("holidayCache").withIndex("by_source", (q) => q.eq("source", HOLIDAY_SOURCE)).unique()
}

function getSync(ctx: Pick<QueryCtx, "db">) {
  return ctx.db.query("holidaySync").withIndex("by_source", (q) => q.eq("source", HOLIDAY_SOURCE)).unique()
}

/** Holidays touching the month (YYYY-MM), with the years the cache covers. */
export const forMonth = companyQuery({
  args: { month: v.string() },
  handler: async (ctx, { month }): Promise<HolidayMonth> => {
    const normalized = normalizeMonthParam(month)
    if (!normalized) throw new ConvexError({ code: "InvalidInput", message: "Invalid month" })
    const [cache, sync] = await Promise.all([getCache(ctx), getSync(ctx)])
    const start = `${normalized}-01`
    const endExclusive = `${shiftMonthParam(normalized, 1)}-01`
    return {
      holidays: cache ? entriesBetween(cache.entries, start, endExclusive) : [],
      coverage: cache ? { firstYear: cache.firstYear, lastYear: cache.lastYear } : null,
      lastRefreshFailed: sync?.lastError != null,
    }
  },
})

export const cachedEntryCount = internalQuery({
  args: {},
  returns: v.union(v.number(), v.null()),
  handler: async (ctx) => (await getCache(ctx))?.entries.length ?? null,
})

/**
 * Records one refresh, in a single transaction. A refresh that started before the
 * newest finished one is ignored, so a slow older download can't overwrite newer data.
 */
export const recordRefresh = internalMutation({
  args: {
    startedAt: v.string(),
    result: v.union(
      v.object({ ok: v.literal(true), entries: v.array(holidayEntry), firstYear: v.number(), lastYear: v.number() }),
      v.object({ ok: v.literal(false), message: v.string() }),
    ),
  },
  returns: refreshOutcome,
  handler: async (ctx, { startedAt, result }): Promise<RefreshOutcome> => {
    const [cache, sync] = await Promise.all([getCache(ctx), getSync(ctx)])
    if (sync && startedAt < sync.lastAttemptAt) return { status: "superseded" }

    const recordFailure = async (message: string): Promise<RefreshOutcome> => {
      const fields = { lastAttemptAt: startedAt, lastError: { at: startedAt, message } }
      if (sync) await ctx.db.patch(sync._id, fields)
      else await ctx.db.insert("holidaySync", { source: HOLIDAY_SOURCE, lastSuccessAt: null, ...fields })
      return { status: "failed", message }
    }
    if (!result.ok) return recordFailure(result.message)
    const feed = { entries: result.entries, firstYear: result.firstYear, lastYear: result.lastYear }
    const rejection = checkReplacement(cache?.entries.length ?? null, feed)
    if (rejection) return recordFailure(rejection)

    const unchanged = cache !== null && sameEntries(cache.entries, feed.entries)
    if (cache && !unchanged) await ctx.db.patch(cache._id, { ...feed, updatedAt: startedAt })
    if (!cache) await ctx.db.insert("holidayCache", { source: HOLIDAY_SOURCE, ...feed, updatedAt: startedAt })
    const fields = { lastAttemptAt: startedAt, lastSuccessAt: startedAt, lastError: null }
    if (sync) await ctx.db.patch(sync._id, fields)
    else await ctx.db.insert("holidaySync", { source: HOLIDAY_SOURCE, ...fields })
    return { status: unchanged ? "unchanged" : "updated" }
  },
})

/** Downloads, parses and records the feed. Parsing finishes before anything is written. */
async function runRefresh(ctx: ActionCtx): Promise<RefreshOutcome> {
  const startedAt = new Date().toISOString()
  let feed
  try {
    feed = parseHolidayFeed(await fetchHolidayFeedText(), new Date())
  } catch (err) {
    const message = err instanceof HolidayFeedError ? err.message : "The feed could not be read"
    console.warn(`Holiday refresh failed: ${message}`)
    return await ctx.runMutation(internal.holidays.recordRefresh, { startedAt, result: { ok: false, message } })
  }
  return await ctx.runMutation(internal.holidays.recordRefresh, { startedAt, result: { ok: true, ...feed } })
}

/** Run weekly by crons.ts; operators can also run it: `npx convex run holidays:refresh` (add `--prod` for production). */
export const refresh = internalAction({
  args: {},
  returns: refreshOutcome,
  handler: (ctx) => runRefresh(ctx),
})

/**
 * One-time setup after deploying: fills an empty cache straight away instead of
 * waiting for the weekly cron. Safe to repeat; does nothing once a cache exists.
 * `npx convex run holidays:bootstrap` (add `--prod` for production).
 */
export const bootstrap = internalAction({
  args: {},
  returns: v.union(refreshOutcome, v.object({ status: v.literal("skipped") })),
  handler: async (ctx): Promise<RefreshOutcome | { status: "skipped" }> => {
    if ((await ctx.runQuery(internal.holidays.cachedEntryCount, {})) !== null) return { status: "skipped" }
    return await runRefresh(ctx)
  },
})
