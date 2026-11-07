import { v } from "convex/values"

import { internal } from "./_generated/api"
import { internalMutation } from "./_generated/server"
import { companyMutation, companyQuery } from "./lib/auth"
import { foodItemNotesPatch, getFoodItemRecords, migratedFoodItemNotes, newFoodItemNotes, toFoodItemRecord } from "./lib/foodItemNotes"
import { backfillPricingBasisBatch, DEFAULT_PRICING_BASIS } from "./lib/pricingBasis"
import { assertUpdates, requireDocument, toRecord } from "./lib/records"
import { foodServiceStyle, nullable, pricingBasis } from "./lib/validators"

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
  // Optional: older app builds don't send it; new items then get "each".
  pricingBasis: v.optional(pricingBasis),
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
      pricingBasis: values.pricingBasis ?? DEFAULT_PRICING_BASIS,
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
      const items = await getFoodItemRecords(ctx, timeblock._id)
      // Keep both names while the existing food section expects `items`.
      return { ...toRecord(timeblock), foodItems: items, items }
    }))
  },
})

const MIGRATION_BATCH_SIZE = 500

/**
 * One-off migration for the note split: moves each item's old `includes` note into
 * `clientNotes`, sets a blank `internalNotes`, and removes `includes`. Already-migrated
 * items are skipped, so running it twice is harmless. It isn't a user edit, so the audit
 * fields are left alone.
 *
 * It works through the table one batch per transaction, so it stays within Convex's
 * per-mutation limits however large the table grows: each batch schedules the next until
 * the table is done. Run once per deployment after deploying the schema change:
 * `npx convex run --prod foodItems:migrateIncludesToClientNotes`
 * The result covers the first batch only; later batches report in the deployment's logs.
 */
export const migrateIncludesToClientNotes = internalMutation({
  args: { cursor: v.optional(v.union(v.string(), v.null())), batchSize: v.optional(v.number()) },
  returns: v.object({ migrated: v.number(), skipped: v.number(), isDone: v.boolean() }),
  handler: async (ctx, { cursor = null, batchSize = MIGRATION_BATCH_SIZE }) => {
    const batch = await ctx.db.query("foodItems").paginate({ cursor, numItems: batchSize })
    let migrated = 0, skipped = 0
    for (const item of batch.page) {
      const patch = migratedFoodItemNotes(item)
      if (!patch) { skipped++; continue }
      await ctx.db.patch("foodItems", item._id, patch)
      migrated++
    }
    console.log(`foodItems:migrateIncludesToClientNotes batch: ${migrated} migrated, ${skipped} already done`)
    if (!batch.isDone) {
      await ctx.scheduler.runAfter(0, internal.foodItems.migrateIncludesToClientNotes, { cursor: batch.continueCursor, batchSize })
    }
    return { migrated, skipped, isDone: batch.isDone }
  },
})

/**
 * One-off migration for the pricing basis: sets `pricingBasis: "each"` on every food item
 * saved before the field existed (missing already reads as "each", so nothing changes for
 * the team). Items that have one are skipped, so running it twice is harmless. Batched like
 * `migrateIncludesToClientNotes` above. Run once per deployment after deploying the schema change:
 * `npx convex run --prod foodItems:backfillPricingBasis`
 * The result covers the first batch only; later batches report in the deployment's logs.
 */
export const backfillPricingBasis = internalMutation({
  args: { cursor: v.optional(v.union(v.string(), v.null())), batchSize: v.optional(v.number()) },
  returns: v.object({ migrated: v.number(), skipped: v.number(), isDone: v.boolean() }),
  handler: async (ctx, { cursor = null, batchSize = MIGRATION_BATCH_SIZE }) => {
    const { continueCursor, ...result } = await backfillPricingBasisBatch(ctx, "foodItems", cursor, batchSize)
    if (!result.isDone) {
      await ctx.scheduler.runAfter(0, internal.foodItems.backfillPricingBasis, { cursor: continueCursor, batchSize })
    }
    return result
  },
})
