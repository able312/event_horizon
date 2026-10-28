import { convexTest } from "convex-test"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { HolidayEntry } from "../src/definitions/holidays"
import { api, internal } from "./_generated/api"
import { HOLIDAY_FEED_URL } from "./lib/holidayFeed"
import { CANADIAN_HOLIDAYS_EXCERPT, EXCERPT_ENTRY_COUNT } from "./lib/holidayFeed.fixture"
import { companyIdentity } from "./lib/testIdentity"
import schema from "./schema"

const modules = import.meta.glob("./**/*.{ts,js}")
const newTest = () => convexTest(schema, modules)

function serveFeed(...bodies: Array<string | number>) {
  const fetchMock = vi.fn()
  for (const body of bodies) {
    fetchMock.mockImplementationOnce(async () =>
      typeof body === "number" ? new Response("error", { status: body }) : new Response(body),
    )
  }
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

function at(iso: string) {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date(iso))
}

const readState = (t: ReturnType<typeof newTest>) =>
  t.run(async (ctx) => ({
    cache: await ctx.db.query("holidayCache").unique(),
    sync: await ctx.db.query("holidaySync").unique(),
  }))

const entry = (id: string, startDate: string, endDate: string): HolidayEntry => ({ id, title: id, startDate, endDate })
const success = (entries: HolidayEntry[]) => ({ ok: true as const, entries, firstYear: 2026, lastYear: 2027 })

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("holidays.forMonth", () => {
  it("only answers company accounts", async () => {
    const t = newTest()
    await expect(t.query(api.holidays.forMonth, { month: "2027-01" })).rejects.toMatchObject({ data: { code: "Unauthenticated" } })
    await expect(t.withIdentity({ ...companyIdentity, email: "someone@example.com" }).query(api.holidays.forMonth, { month: "2027-01" }))
      .rejects.toMatchObject({ data: { code: "Forbidden" } })
  })

  it("loads a deployment with no holiday data, alongside its existing events", async () => {
    const t = newTest()
    await t.run((ctx) => ctx.db.insert("events", {
      title: "Existing", type: "wedding", status: "confirmed", startDateTime: "2027-01-10T17:00:00.000Z", endDateTime: null,
      minGuests: null, maxGuests: null, guestCountFinal: null, driveFolderId: null, calendarId: null,
      clientNotes: null, internalNotes: null, isInternal: 0, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: null,
    }))
    const staff = t.withIdentity(companyIdentity)
    expect(await staff.query(api.holidays.forMonth, { month: "2027-01" }))
      .toEqual({ holidays: [], coverage: null, lastRefreshFailed: false })
    const events = await staff.query(api.events.getStartingBetween, { startFrom: "2027-01-01T00:00:00.000Z", startTo: "2027-02-01T00:00:00.000Z" })
    expect(events.map((event) => event.title)).toEqual(["Existing"])
  })

  it("returns entries touching the month, including spans that start before it", async () => {
    const t = newTest()
    await t.mutation(internal.holidays.recordRefresh, {
      startedAt: "2026-10-01T00:00:00.000Z",
      result: success([
        entry("december", "2026-12-25", "2026-12-26"),
        entry("span", "2026-12-31", "2027-01-02"),
        entry("january", "2027-01-15", "2027-01-16"),
        entry("ends-at-february", "2027-01-31", "2027-02-01"),
      ]),
    })
    const staff = t.withIdentity(companyIdentity)
    const january = await staff.query(api.holidays.forMonth, { month: "2027-1" })
    expect(january.holidays.map((holiday) => holiday.id)).toEqual(["span", "january", "ends-at-february"])
    expect(january.coverage).toEqual({ firstYear: 2026, lastYear: 2027 })
    expect((await staff.query(api.holidays.forMonth, { month: "2027-02" })).holidays).toEqual([])
    await expect(staff.query(api.holidays.forMonth, { month: "January" })).rejects.toMatchObject({ data: { code: "InvalidInput" } })
  })
})

describe("holiday refresh", () => {
  it("bootstraps an empty cache once, and is a no-op afterwards", async () => {
    const t = newTest()
    const fetchMock = serveFeed(CANADIAN_HOLIDAYS_EXCERPT)
    expect(await t.action(internal.holidays.bootstrap, {})).toEqual({ status: "updated" })
    expect(await t.action(internal.holidays.bootstrap, {})).toEqual({ status: "skipped" })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(HOLIDAY_FEED_URL, expect.anything())

    const { cache, sync } = await readState(t)
    expect(cache?.entries).toHaveLength(EXCERPT_ENTRY_COUNT)
    expect(sync).toMatchObject({ lastError: null })
    const august = await t.withIdentity(companyIdentity).query(api.holidays.forMonth, { month: "2027-08" })
    expect(august.holidays.filter((holiday) => holiday.startDate === "2027-08-02")).toHaveLength(4)
  })

  it("only refreshes freshness metadata when the feed hasn't changed", async () => {
    const t = newTest()
    serveFeed(CANADIAN_HOLIDAYS_EXCERPT, CANADIAN_HOLIDAYS_EXCERPT)
    at("2026-10-01T00:00:00.000Z")
    await t.action(internal.holidays.refresh, {})
    const before = await readState(t)
    at("2026-10-08T00:00:00.000Z")
    expect(await t.action(internal.holidays.refresh, {})).toEqual({ status: "unchanged" })
    const after = await readState(t)
    expect(after.cache).toEqual(before.cache)
    expect(after.sync).toMatchObject({ lastSuccessAt: "2026-10-08T00:00:00.000Z", lastError: null })
  })

  it("keeps the last good holidays when a refresh fails, then clears the failure on success", async () => {
    const t = newTest()
    const truncated = CANADIAN_HOLIDAYS_EXCERPT.slice(0, CANADIAN_HOLIDAYS_EXCERPT.length / 2)
    const empty = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR\r\n"
    serveFeed(CANADIAN_HOLIDAYS_EXCERPT, 500, "<html>oops</html>\nEND:VCALENDAR", truncated, empty, CANADIAN_HOLIDAYS_EXCERPT)
    at("2026-10-01T00:00:00.000Z")
    await t.action(internal.holidays.refresh, {})
    const good = await readState(t)

    for (const [day, message] of [["02", "HTTP 500"], ["03", "not a valid calendar"], ["04", "incomplete"], ["05", "only 0 entries"]]) {
      at(`2026-10-${day}T00:00:00.000Z`)
      expect(await t.action(internal.holidays.refresh, {})).toMatchObject({ status: "failed", message: expect.stringContaining(message) })
      const state = await readState(t)
      expect(state.cache).toEqual(good.cache)
      expect(state.sync).toMatchObject({ lastSuccessAt: "2026-10-01T00:00:00.000Z", lastAttemptAt: `2026-10-${day}T00:00:00.000Z` })
    }
    const staff = t.withIdentity(companyIdentity)
    const stale = await staff.query(api.holidays.forMonth, { month: "2027-12" })
    expect(stale.lastRefreshFailed).toBe(true)
    expect(stale.holidays.length).toBeGreaterThan(0)

    at("2026-10-06T00:00:00.000Z")
    expect(await t.action(internal.holidays.refresh, {})).toEqual({ status: "unchanged" })
    expect((await staff.query(api.holidays.forMonth, { month: "2027-12" })).lastRefreshFailed).toBe(false)
  })

  it("records a failure before any cache exists without inventing holidays", async () => {
    const t = newTest()
    serveFeed(503)
    expect(await t.action(internal.holidays.bootstrap, {})).toMatchObject({ status: "failed" })
    expect(await t.withIdentity(companyIdentity).query(api.holidays.forMonth, { month: "2027-01" }))
      .toEqual({ holidays: [], coverage: null, lastRefreshFailed: true })
  })

  it("refuses a replacement that lost most of the cached entries", async () => {
    const t = newTest()
    const many = Array.from({ length: 40 }, (_, i) => entry(`e${i}`, "2027-01-01", "2027-01-02"))
    await t.mutation(internal.holidays.recordRefresh, { startedAt: "2026-10-01T00:00:00.000Z", result: success(many) })
    expect(await t.mutation(internal.holidays.recordRefresh, { startedAt: "2026-10-02T00:00:00.000Z", result: success(many.slice(0, 10)) }))
      .toMatchObject({ status: "failed", message: expect.stringContaining("dropped from 40 to 10") })
    expect((await readState(t)).cache?.entries).toHaveLength(40)
  })

  it("never lets an older refresh overwrite a newer one", async () => {
    const t = newTest()
    const older = [entry("older", "2027-01-01", "2027-01-02")]
    const newer = [entry("newer", "2027-01-01", "2027-01-02")]
    expect(await t.mutation(internal.holidays.recordRefresh, { startedAt: "2026-10-02T00:00:00.000Z", result: success(newer) }))
      .toEqual({ status: "updated" })
    expect(await t.mutation(internal.holidays.recordRefresh, { startedAt: "2026-10-01T00:00:00.000Z", result: success(older) }))
      .toEqual({ status: "superseded" })
    expect(await t.mutation(internal.holidays.recordRefresh, { startedAt: "2026-10-01T00:00:00.000Z", result: { ok: false, message: "late failure" } }))
      .toEqual({ status: "superseded" })
    const { cache, sync } = await readState(t)
    expect(cache?.entries.map((holiday) => holiday.id)).toEqual(["newer"])
    expect(sync).toMatchObject({ lastAttemptAt: "2026-10-02T00:00:00.000Z", lastError: null })
  })
})
