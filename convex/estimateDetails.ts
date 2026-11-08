import { v } from "convex/values"

import { companyMutation, companyQuery } from "./lib/auth"
import { assertUpdates, requireDocument, toRecord } from "./lib/records"
import { depositKind, nullable } from "./lib/validators"

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Rejects values the Estimate can't print: a negative or fractional amount, a percent outside 0-100, or a date that isn't YYYY-MM-DD. */
function assertValidEstimateUpdates(updates: {
  validUntil?: string | null
  depositAmountCents?: number | null
  depositPercent?: number | null
  depositDueDate?: string | null
}): void {
  const { depositAmountCents, depositPercent } = updates
  if (depositAmountCents != null && (!Number.isInteger(depositAmountCents) || depositAmountCents < 0)) {
    throw new Error("estimateDetails: depositAmountCents must be a whole number of cents, 0 or more")
  }
  if (depositPercent != null && (!Number.isFinite(depositPercent) || depositPercent < 0 || depositPercent > 100)) {
    throw new Error("estimateDetails: depositPercent must be between 0 and 100")
  }
  for (const field of ["validUntil", "depositDueDate"] as const) {
    const value = updates[field]
    if (value != null && !DATE_PATTERN.test(value)) throw new Error(`estimateDetails: ${field} must be a YYYY-MM-DD date`)
  }
}

// Reads never write. The renderer must call ensureByEventId before subscribing.
// Public functions; every handler requires a company identity (lib/auth.ts).
export const getByEventId = companyQuery({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const doc = await ctx.db.query("estimateDetails").withIndex("by_event", (q) => q.eq("eventId", eventId)).unique()
    if (!doc) throw new Error("estimateDetails: details not found for event")
    return toRecord(doc)
  },
})

// The indexed read and insert share one transaction. Convex retries competing
// writes, so repeated initialization cannot create a second row for an event.
export const ensureByEventId = companyMutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    await requireDocument(ctx, "events", eventId)
    const existing = await ctx.db.query("estimateDetails").withIndex("by_event", (q) => q.eq("eventId", eventId)).unique()
    if (existing) return toRecord(existing)
    const id = await ctx.db.insert("estimateDetails", {
      eventId,
      introNote: null,
      validUntil: null,
      terms: null,
      depositKind: "none",
      depositAmountCents: null,
      depositPercent: null,
      depositDueDate: null,
      depositNote: null,
      createdAt: new Date().toISOString(),
      updatedAt: null,
    })
    return toRecord(await requireDocument(ctx, "estimateDetails", id))
  },
})

export const update = companyMutation({
  args: { id: v.id("estimateDetails"), updates: v.object({
    introNote: v.optional(nullable(v.string())),
    validUntil: v.optional(nullable(v.string())),
    terms: v.optional(nullable(v.string())),
    depositKind: v.optional(depositKind),
    depositAmountCents: v.optional(nullable(v.number())),
    depositPercent: v.optional(nullable(v.number())),
    depositDueDate: v.optional(nullable(v.string())),
    depositNote: v.optional(nullable(v.string())),
  }) },
  handler: async (ctx, { id, updates }) => {
    assertUpdates(updates)
    assertValidEstimateUpdates(updates)
    await requireDocument(ctx, "estimateDetails", id)
    await ctx.db.patch("estimateDetails", id, { ...updates, updatedAt: new Date().toISOString() })
    return toRecord(await requireDocument(ctx, "estimateDetails", id))
  },
})
