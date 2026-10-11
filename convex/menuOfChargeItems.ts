import { v } from "convex/values"

import { companyMutation, companyQuery } from "./lib/auth"
import { assertUpdates, requireDocument, toRecord } from "./lib/records"
import { chargeCategory, nullable } from "./lib/validators"

// Public functions; every handler requires a company identity (lib/auth.ts).
export const getByEventId = companyQuery({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const docs = await ctx.db.query("menuOfChargeItems").withIndex("by_event", (q) => q.eq("eventId", eventId)).collect()
    return docs.map((doc) => toRecord(doc))
  },
})

export const create = companyMutation({
  args: { eventId: v.id("events"), category: v.optional(nullable(chargeCategory)) },
  handler: async (ctx, { eventId, category }) => {
    await requireDocument(ctx, "events", eventId)
    const now = new Date().toISOString()
    const id = await ctx.db.insert("menuOfChargeItems", {
      eventId,
      name: "",
      quantity: 0,
      category: category ?? null,
      includes: "",
      unitPriceCents: 0,
      createdAt: now,
    })
    return toRecord(await requireDocument(ctx, "menuOfChargeItems", id))
  },
})

export const update = companyMutation({
  args: { id: v.id("menuOfChargeItems"), updates: v.object({
    name: v.optional(v.string()),
    quantity: v.optional(nullable(v.number())),
    category: v.optional(nullable(chargeCategory)),
    includes: v.optional(nullable(v.string())),
    unitPriceCents: v.optional(nullable(v.number())),
  }) },
  handler: async (ctx, { id, updates }) => {
    assertUpdates(updates)
    await requireDocument(ctx, "menuOfChargeItems", id)
    await ctx.db.patch("menuOfChargeItems", id, updates)
    return toRecord(await requireDocument(ctx, "menuOfChargeItems", id))
  },
})

export const remove = companyMutation({
  args: { id: v.id("menuOfChargeItems") },
  handler: async (ctx, { id }) => {
    await requireDocument(ctx, "menuOfChargeItems", id)
    await ctx.db.delete("menuOfChargeItems", id)
    return true
  },
})
