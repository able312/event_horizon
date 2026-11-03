import { v } from "convex/values"

import { internalMutation } from "./_generated/server"
import { companyMutation, companyQuery } from "./lib/auth"
import { foodItemNotesPatch, migratedFoodItemNotes, newFoodItemNotes, toFoodItemRecord } from "./lib/foodItemNotes"
import { assertUpdates, requireDocument, toRecord } from "./lib/records"
import { foodServiceStyle, nullable } from "./lib/validators"

const editableFields = {
  name: v.optional(v.string()),
  quantity: v.optional(nullable(v.number())),
  serviceStyle: v.optional(nullable(foodServiceStyle)),
  clientNotes: v.optional(nullable(v.string())),
  internalNotes: v.optional(nullable(v.string())),
  // Still accepted from app builds made before the note split; saved as `clientNotes`.
  // See lib/foodItemNotes.ts for when this can go.
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
      ...newFoodItemNotes(values),
      unitPriceCents: values.unitPriceCents ?? null,
    })
    return toFoodItemRecord(await requireDocument(ctx, "foodItems", id))
  },
})

export const update = companyMutation({
  args: { id: v.id("foodItems"), updates: v.object(editableFields) },
  handler: async (ctx, { id, updates }) => {
    assertUpdates(updates)
    const current = await requireDocument(ctx, "foodItems", id)
    await ctx.db.patch("foodItems", id, foodItemNotesPatch(updates, current))
    return toFoodItemRecord(await requireDocument(ctx, "foodItems", id))
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
        .withIndex("by_timeblock", (q) => q.eq("timeblockId", timeblock._id)).collect()).map(toFoodItemRecord)
      // Keep both names while the existing food section expects `items`.
      return { ...toRecord(timeblock), foodItems: items, items }
    }))
  },
})

/**
 * One-off migration for the note split: moves each item's old `includes` note into
 * `clientNotes`, sets a blank `internalNotes`, and removes `includes`. Already-migrated
 * items are skipped, so running it twice is harmless. It isn't a user edit, so the audit
 * fields are left alone. Run once per deployment after deploying the schema change:
 * `npx convex run --prod foodItems:migrateIncludesToClientNotes`
 */
export const migrateIncludesToClientNotes = internalMutation({
  args: {},
  returns: v.object({ migrated: v.number(), skipped: v.number() }),
  handler: async (ctx) => {
    let migrated = 0, skipped = 0
    for (const item of await ctx.db.query("foodItems").collect()) {
      const patch = migratedFoodItemNotes(item)
      if (!patch) { skipped++; continue }
      await ctx.db.patch("foodItems", item._id, patch)
      migrated++
    }
    return { migrated, skipped }
  },
})
