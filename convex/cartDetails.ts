import { v } from "convex/values"

import { internalMutation, internalQuery } from "./_generated/server"
import { assertUpdates, requireDocument, toRecord } from "./lib/records"
import { cartGrid, cartLayout, nullable } from "./lib/validators"

// Reads never write. The renderer must call ensureByEventId before subscribing.
// Internal until authenticated public functions are introduced in Step 3.
export const getByEventId = internalQuery({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const doc = await ctx.db.query("cartDetails").withIndex("by_event", (q) => q.eq("eventId", eventId)).unique()
    if (!doc) throw new Error("cartDetails: details not found for event")
    return toRecord(doc)
  },
})

// The indexed read and insert share one transaction. Convex retries competing
// writes, so repeated initialization cannot create a second row for an event.
export const ensureByEventId = internalMutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    await requireDocument(ctx, "events", eventId)
    const existing = await ctx.db.query("cartDetails").withIndex("by_event", (q) => q.eq("eventId", eventId)).unique()
    if (existing) return toRecord(existing)
    const id = await ctx.db.insert("cartDetails", {
      eventId,
      time: null,
      layout: "template-12-hole-shotgun",
      customGrid: null,
      whatGoesOnCarts: null,
      assignedTo: null,
      rentingCarts: false,
      createdAt: new Date().toISOString(),
      updatedAt: null,
    })
    return toRecord(await requireDocument(ctx, "cartDetails", id))
  },
})

export const update = internalMutation({
  args: { id: v.id("cartDetails"), updates: v.object({
    time: v.optional(nullable(v.string())),
    layout: v.optional(cartLayout),
    customGrid: v.optional(nullable(cartGrid)),
    whatGoesOnCarts: v.optional(nullable(v.string())),
    assignedTo: v.optional(nullable(v.string())),
    rentingCarts: v.optional(v.boolean()),
  }) },
  handler: async (ctx, { id, updates }) => {
    assertUpdates(updates)
    await requireDocument(ctx, "cartDetails", id)
    await ctx.db.patch("cartDetails", id, { ...updates, updatedAt: new Date().toISOString() })
    return toRecord(await requireDocument(ctx, "cartDetails", id))
  },
})
