import { v } from "convex/values"

import { companyMutation, companyQuery } from "./lib/auth"
import { assertUpdates, requireDocument, toRecord } from "./lib/records"
import { foodServiceStyle, nullable } from "./lib/validators"

const editableFields = {
  name: v.optional(v.string()),
  quantity: v.optional(nullable(v.number())),
  serviceStyle: v.optional(nullable(foodServiceStyle)),
  includes: v.optional(nullable(v.string())),
  unitPriceCents: v.optional(nullable(v.number())),
}

// Public functions; every handler requires a company identity (lib/auth.ts).
export const create = companyMutation({
  args: { ...editableFields, timeblockId: v.id("timeblocks"), name: v.string() },
  handler: async (ctx, { timeblockId, name, ...values }) => {
    const timeblock = await requireDocument(ctx, "timeblocks", timeblockId)
    if (timeblock.sectionType !== "food") throw new Error("Food items require a food timeblock")
    const id = await ctx.db.insert("foodItems", {
      timeblockId,
      name,
      quantity: values.quantity ?? null,
      serviceStyle: values.serviceStyle ?? null,
      includes: values.includes ?? null,
      unitPriceCents: values.unitPriceCents ?? null,
    })
    return toRecord(await requireDocument(ctx, "foodItems", id))
  },
})

export const update = companyMutation({
  args: { id: v.id("foodItems"), updates: v.object(editableFields) },
  handler: async (ctx, { id, updates }) => {
    assertUpdates(updates)
    await requireDocument(ctx, "foodItems", id)
    await ctx.db.patch("foodItems", id, updates)
    return toRecord(await requireDocument(ctx, "foodItems", id))
  },
})

export const remove = companyMutation({
  args: { id: v.id("foodItems") },
  handler: async (ctx, { id }) => {
    await requireDocument(ctx, "foodItems", id)
    await ctx.db.delete("foodItems", id)
    return true
  },
})

export const getByEventId = companyQuery({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const timeblocks = await ctx.db.query("timeblocks")
      .withIndex("by_event_section", (q) => q.eq("eventId", eventId).eq("sectionType", "food")).collect()
    return Promise.all(timeblocks.map(async (timeblock) => {
      const items = (await ctx.db.query("foodItems")
        .withIndex("by_timeblock", (q) => q.eq("timeblockId", timeblock._id)).collect()).map(toRecord)
      // Keep both names while the existing food section expects `items`.
      return { ...toRecord(timeblock), foodItems: items, items }
    }))
  },
})
