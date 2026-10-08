import { v } from "convex/values"

import { internalMutation, internalQuery } from "./_generated/server"
import { assertUpdates, requireDocument, toRecord } from "./lib/records"
import { nullable } from "./lib/validators"

// Internal until authenticated public functions are introduced in Step 3.
export const getByEventId = internalQuery({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const docs = await ctx.db.query("payments").withIndex("by_event", (q) => q.eq("eventId", eventId)).collect()
    return docs.map((doc) => toRecord(doc))
  },
})

export const create = internalMutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    await requireDocument(ctx, "events", eventId)
    const now = new Date().toISOString()
    const id = await ctx.db.insert("payments", {
      eventId,
      amountCents: 0,
      date: now,
      recieptNumber: "",
      notes: "",
      createdAt: now,
    })
    return toRecord(await requireDocument(ctx, "payments", id))
  },
})

export const update = internalMutation({
  args: { id: v.id("payments"), updates: v.object({
    amountCents: v.optional(v.number()),
    date: v.optional(v.string()),
    recieptNumber: v.optional(nullable(v.string())),
    notes: v.optional(nullable(v.string())),
  }) },
  handler: async (ctx, { id, updates }) => {
    assertUpdates(updates)
    await requireDocument(ctx, "payments", id)
    await ctx.db.patch("payments", id, updates)
    return toRecord(await requireDocument(ctx, "payments", id))
  },
})

export const remove = internalMutation({
  args: { id: v.id("payments") },
  handler: async (ctx, { id }) => {
    await requireDocument(ctx, "payments", id)
    await ctx.db.delete("payments", id)
    return true
  },
})

// Retained while the renderer still loads all payments; prefer getByEventId.
export const getAll = internalQuery({
  args: {},
  handler: async (ctx) => (await ctx.db.query("payments").collect()).map((doc) => toRecord(doc)),
})
