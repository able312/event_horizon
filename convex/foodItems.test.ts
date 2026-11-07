import { convexTest } from "convex-test"
import { afterEach, describe, expect, it, vi } from "vitest"

import { api, internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel"
import { companyIdentity } from "./lib/testIdentity"
import schema from "./schema"

const modules = import.meta.glob("./**/*.{ts,js}")

async function setup() {
  const t = convexTest(schema, modules).withIdentity(companyIdentity)
  const eventId = await t.run((ctx) => ctx.db.insert("events", {
    title: "Dinner", type: "function", status: "new_lead",
    startDateTime: "2026-10-25T02:00:00.000Z", endDateTime: null,
    minGuests: null, maxGuests: null, guestCountFinal: null,
    driveFolderId: null, calendarId: null, clientNotes: null, internalNotes: null,
    isInternal: 0, createdAt: "1790812800000", updatedAt: null,
  }))
  const food = await t.mutation(api.timeblocks.create, { eventId, sectionType: "food", title: "Dinner", time: "18:00" })
  /** An item as stored before the note split: only `includes`. */
  const insertLegacyItem = (name: string, includes: string | null) => t.run((ctx) => ctx.db.insert("foodItems", {
    timeblockId: food.id, name, quantity: null, serviceStyle: null, includes, unitPriceCents: null,
  }))
  const stored = (id: Id<"foodItems">) => t.run((ctx) => ctx.db.get("foodItems", id))
  return { t, eventId, food, insertLegacyItem, stored }
}

describe("food item notes", () => {
  it("creates items with separate client and internal notes", async () => {
    const { t, food, stored } = await setup()
    const item = await t.mutation(api.foodItems.create, { timeblockId: food.id, name: "Steak", clientNotes: "Medium", internalNotes: "Fire at 6:30" })
    expect(item).toMatchObject({ clientNotes: "Medium", internalNotes: "Fire at 6:30" })
    expect(await stored(item.id)).not.toHaveProperty("includes")
  })

  it("updates one note without touching the other", async () => {
    const { t, food } = await setup()
    const item = await t.mutation(api.foodItems.create, { timeblockId: food.id, name: "Steak", clientNotes: "Medium" })
    expect(await t.mutation(api.foodItems.update, { id: item.id, updates: { internalNotes: "Allergy table 4" } }))
      .toMatchObject({ clientNotes: "Medium", internalNotes: "Allergy table 4" })
    expect(await t.mutation(api.foodItems.update, { id: item.id, updates: { clientNotes: "" } }))
      .toMatchObject({ clientNotes: "", internalNotes: "Allergy table 4" })
  })

  describe("older app builds", () => {
    it("save a note sent as `includes` as the client note", async () => {
      const { t, food, stored } = await setup()
      const created = await t.mutation(api.foodItems.create, { timeblockId: food.id, name: "Soup", includes: "Croutons" })
      expect(created).toMatchObject({ clientNotes: "Croutons", internalNotes: null })
      const updated = await t.mutation(api.foodItems.update, { id: created.id, updates: { includes: "No croutons" } })
      expect(updated).toMatchObject({ clientNotes: "No croutons", internalNotes: null })
      expect(await stored(created.id)).not.toHaveProperty("includes")
    })

    it("still read the client note as `includes`", async () => {
      const { t, eventId, food } = await setup()
      await t.mutation(api.foodItems.create, { timeblockId: food.id, name: "Soup", clientNotes: "Croutons", internalNotes: "Hot" })
      const [section] = await t.query(api.foodItems.getByEventId, { eventId })
      expect(section?.foodItems[0]).toMatchObject({ clientNotes: "Croutons", internalNotes: "Hot", includes: "Croutons" })
      const focused = await t.query(api.timeblocks.getById, { id: food.id })
      expect(focused?.foodItems[0]).toMatchObject({ clientNotes: "Croutons", includes: "Croutons" })
    })
  })

  describe("items stored before the migration", () => {
    it("read their old note as the client note", async () => {
      const { t, eventId, insertLegacyItem } = await setup()
      await insertLegacyItem("Salad", "Dressing on the side")
      const [section] = await t.query(api.foodItems.getByEventId, { eventId })
      expect(section?.foodItems[0]).toMatchObject({ clientNotes: "Dressing on the side", internalNotes: null })
    })

    it("keep their old note when another field is edited", async () => {
      const { t, insertLegacyItem, stored } = await setup()
      const id = await insertLegacyItem("Salad", "Dressing on the side")
      expect(await t.mutation(api.foodItems.update, { id, updates: { internalNotes: "Plate at 7" } }))
        .toMatchObject({ clientNotes: "Dressing on the side", internalNotes: "Plate at 7" })
      const doc = await stored(id)
      expect(doc).toMatchObject({ clientNotes: "Dressing on the side", internalNotes: "Plate at 7" })
      expect(doc).not.toHaveProperty("includes")
    })
  })

  describe("migrateIncludesToClientNotes", () => {
    it("moves every old note into the client note and can run twice", async () => {
      const { t, food, insertLegacyItem, stored } = await setup()
      const withNote = await insertLegacyItem("Salad", "Dressing")
      const blank = await insertLegacyItem("Bread", null)
      const current = await t.mutation(api.foodItems.create, { timeblockId: food.id, name: "Steak", clientNotes: "Medium", internalNotes: "Fire at 6:30" })

      expect(await t.mutation(internal.foodItems.migrateIncludesToClientNotes, {})).toEqual({ migrated: 2, skipped: 1, isDone: true })
      for (const [id, clientNotes] of [[withNote, "Dressing"], [blank, null]] as const) {
        const doc = await stored(id)
        expect(doc).toMatchObject({ clientNotes, internalNotes: null })
        expect(doc).not.toHaveProperty("includes")
        // A migration isn't a user edit: no audit stamp.
        expect(doc).not.toHaveProperty("updatedBy")
      }
      expect(await stored(current.id)).toMatchObject({ clientNotes: "Medium", internalNotes: "Fire at 6:30" })

      expect(await t.mutation(internal.foodItems.migrateIncludesToClientNotes, {})).toEqual({ migrated: 0, skipped: 3, isDone: true })
    })

    describe("in batches", () => {
      afterEach(() => vi.useRealTimers())

      it("schedules the next batch until the whole table is migrated", async () => {
        vi.useFakeTimers()
        const { t, insertLegacyItem, stored } = await setup()
        const ids = [
          await insertLegacyItem("Salad", "Dressing"),
          await insertLegacyItem("Bread", null),
          await insertLegacyItem("Soup", "Croutons"),
        ]

        expect(await t.mutation(internal.foodItems.migrateIncludesToClientNotes, { batchSize: 1 }))
          .toEqual({ migrated: 1, skipped: 0, isDone: false })
        await t.finishAllScheduledFunctions(vi.runAllTimers)

        for (const id of ids) {
          const doc = await stored(id)
          expect(doc).toHaveProperty("clientNotes")
          expect(doc).not.toHaveProperty("includes")
        }
        expect(await stored(ids[2])).toMatchObject({ clientNotes: "Croutons", internalNotes: null })
      })
    })
  })
})

describe("food item pricing basis", () => {
  it("saves and updates the pricing basis", async () => {
    const { t, food, stored } = await setup()
    const item = await t.mutation(api.foodItems.create, { timeblockId: food.id, name: "Canapés", pricingBasis: "per_person" })
    expect(item).toMatchObject({ pricingBasis: "per_person" })
    expect(await t.mutation(api.foodItems.update, { id: item.id, updates: { pricingBasis: "each" } }))
      .toMatchObject({ pricingBasis: "each" })
    expect(await stored(item.id)).toMatchObject({ pricingBasis: "each" })
  })

  it("stores \"each\" when an older build creates an item without one", async () => {
    const { t, food, stored } = await setup()
    const item = await t.mutation(api.foodItems.create, { timeblockId: food.id, name: "Platter", quantity: 2 })
    expect(item).toMatchObject({ pricingBasis: "each" })
    expect(await stored(item.id)).toMatchObject({ pricingBasis: "each" })
    // Editing another field leaves it alone.
    expect(await t.mutation(api.foodItems.update, { id: item.id, updates: { quantity: 3 } })).toMatchObject({ pricingBasis: "each" })
  })

  it("reads items stored without one as \"each\"", async () => {
    const { t, eventId, food, insertLegacyItem, stored } = await setup()
    const id = await insertLegacyItem("Salad", null)
    expect(await stored(id)).not.toHaveProperty("pricingBasis")
    const [section] = await t.query(api.foodItems.getByEventId, { eventId })
    expect(section?.foodItems[0]).toMatchObject({ pricingBasis: "each" })
    const focused = await t.query(api.timeblocks.getById, { id: food.id })
    expect(focused?.foodItems[0]).toMatchObject({ pricingBasis: "each" })
  })

  describe("backfillPricingBasis", () => {
    afterEach(() => vi.useRealTimers())

    it("sets \"each\" where it is missing, skips items that have one, and can run twice", async () => {
      const { t, food, insertLegacyItem, stored } = await setup()
      const missing = await insertLegacyItem("Salad", null)
      const perPerson = await t.mutation(api.foodItems.create, { timeblockId: food.id, name: "Canapés", pricingBasis: "per_person" })

      expect(await t.mutation(internal.foodItems.backfillPricingBasis, {})).toEqual({ migrated: 1, skipped: 1, isDone: true })
      const doc = await stored(missing)
      expect(doc).toMatchObject({ pricingBasis: "each" })
      expect(doc).not.toHaveProperty("updatedBy")
      expect(await stored(perPerson.id)).toMatchObject({ pricingBasis: "per_person" })

      expect(await t.mutation(internal.foodItems.backfillPricingBasis, {})).toEqual({ migrated: 0, skipped: 2, isDone: true })
    })

    it("schedules the next batch until the whole table is done", async () => {
      vi.useFakeTimers()
      const { t, insertLegacyItem, stored } = await setup()
      const ids = [await insertLegacyItem("Salad", null), await insertLegacyItem("Bread", null), await insertLegacyItem("Soup", null)]

      expect(await t.mutation(internal.foodItems.backfillPricingBasis, { batchSize: 1 })).toEqual({ migrated: 1, skipped: 0, isDone: false })
      await t.finishAllScheduledFunctions(vi.runAllTimers)
      for (const id of ids) expect(await stored(id)).toMatchObject({ pricingBasis: "each" })
    })
  })
})

describe("food item add-ons", () => {
  it("saves and updates isAddOn", async () => {
    const { t, food, stored } = await setup()
    const item = await t.mutation(api.foodItems.create, { timeblockId: food.id, name: "Oysters", isAddOn: true })
    expect(item).toMatchObject({ isAddOn: true })
    expect(await t.mutation(api.foodItems.update, { id: item.id, updates: { isAddOn: false } })).toMatchObject({ isAddOn: false })
    expect(await stored(item.id)).toMatchObject({ isAddOn: false })
  })

  it("stores false when an older build creates an item without it", async () => {
    const { t, food, stored } = await setup()
    const item = await t.mutation(api.foodItems.create, { timeblockId: food.id, name: "Salad" })
    expect(item).toMatchObject({ isAddOn: false })
    expect(await stored(item.id)).toMatchObject({ isAddOn: false })
  })

  it("reads items stored without it as false", async () => {
    const { t, eventId, food, insertLegacyItem, stored } = await setup()
    const id = await insertLegacyItem("Salad", null)
    expect(await stored(id)).not.toHaveProperty("isAddOn")
    const [section] = await t.query(api.foodItems.getByEventId, { eventId })
    expect(section?.foodItems[0]).toMatchObject({ isAddOn: false })
    const focused = await t.query(api.timeblocks.getById, { id: food.id })
    expect(focused?.foodItems[0]).toMatchObject({ isAddOn: false })
    expect(await t.mutation(api.foodItems.update, { id, updates: { name: "Greens" } })).toMatchObject({ isAddOn: false })
  })

  describe("backfillAddOn", () => {
    afterEach(() => vi.useRealTimers())

    it("sets false where it is missing, skips items that have it, and can run twice", async () => {
      const { t, food, insertLegacyItem, stored } = await setup()
      const missing = await insertLegacyItem("Salad", null)
      const addOn = await t.mutation(api.foodItems.create, { timeblockId: food.id, name: "Oysters", isAddOn: true })

      expect(await t.mutation(internal.foodItems.backfillAddOn, {})).toEqual({ migrated: 1, skipped: 1, isDone: true })
      const doc = await stored(missing)
      expect(doc).toMatchObject({ isAddOn: false })
      expect(doc).not.toHaveProperty("updatedBy")
      // Only its own field: the pricing basis backfill is separate.
      expect(doc).not.toHaveProperty("pricingBasis")
      expect(await stored(addOn.id)).toMatchObject({ isAddOn: true })

      expect(await t.mutation(internal.foodItems.backfillAddOn, {})).toEqual({ migrated: 0, skipped: 2, isDone: true })
    })

    it("schedules the next batch until the whole table is done", async () => {
      vi.useFakeTimers()
      const { t, insertLegacyItem, stored } = await setup()
      const ids = [await insertLegacyItem("Salad", null), await insertLegacyItem("Bread", null), await insertLegacyItem("Soup", null)]

      expect(await t.mutation(internal.foodItems.backfillAddOn, { batchSize: 1 })).toEqual({ migrated: 1, skipped: 0, isDone: false })
      await t.finishAllScheduledFunctions(vi.runAllTimers)
      for (const id of ids) expect(await stored(id)).toMatchObject({ isAddOn: false })
    })
  })
})
