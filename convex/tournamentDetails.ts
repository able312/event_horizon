import { v } from "convex/values"

import { companyMutation, companyQuery } from "./lib/auth"
import { assertUpdates, requireDocument, toRecord } from "./lib/records"
import { nullable, playFormat, startFormat } from "./lib/validators"

// Reads never write. The renderer must call ensureByEventId before subscribing.
// Public functions; every handler requires a company identity (lib/auth.ts).
export const getByEventId = companyQuery({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const doc = await ctx.db.query("tournamentDetails").withIndex("by_event", (q) => q.eq("eventId", eventId)).unique()
    if (!doc) throw new Error("tournamentDetails: details not found for event")
    return toRecord(doc)
  },
})

// The indexed read and insert share one transaction. Convex retries competing
// writes, so repeated initialization cannot create a second row for an event.
export const ensureByEventId = companyMutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    await requireDocument(ctx, "events", eventId)
    const existing = await ctx.db.query("tournamentDetails").withIndex("by_event", (q) => q.eq("eventId", eventId)).unique()
    if (existing) return toRecord(existing)
    const id = await ctx.db.insert("tournamentDetails", {
      eventId,
      time: null,
      startFormat: "Shotgun",
      playFormat: "Scramble",
      numberOfPlayers: null,
      paceOfPlay: null,
      leadCarts: null,
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: null,
    })
    return toRecord(await requireDocument(ctx, "tournamentDetails", id))
  },
})

export const update = companyMutation({
  args: { id: v.id("tournamentDetails"), updates: v.object({
    time: v.optional(nullable(v.string())),
    startFormat: v.optional(nullable(startFormat)),
    playFormat: v.optional(nullable(playFormat)),
    numberOfPlayers: v.optional(nullable(v.number())),
    paceOfPlay: v.optional(nullable(v.string())),
    leadCarts: v.optional(nullable(v.string())),
    notes: v.optional(nullable(v.string())),
  }) },
  handler: async (ctx, { id, updates }) => {
    assertUpdates(updates)
    await requireDocument(ctx, "tournamentDetails", id)
    await ctx.db.patch("tournamentDetails", id, { ...updates, updatedAt: new Date().toISOString() })
    return toRecord(await requireDocument(ctx, "tournamentDetails", id))
  },
})
