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
  /** A timeblock as stored before the estimate fields existed. */
  const insertLegacyTimeblock = (sectionType: "food" | "beverage", title: string) => t.run((ctx) => ctx.db.insert("timeblocks", {
    eventId, sectionType, title, time: "18:00", details: null, assignedTo: null, createdAt: "1790812800000", updatedAt: null,
  }))
  const stored = (id: Id<"timeblocks">) => t.run((ctx) => ctx.db.get("timeblocks", id))
  return { t, eventId, insertLegacyTimeblock, stored }
}

describe("timeblock estimate fields", () => {
  it("creates timeblocks that aren't add-ons and have no package price", async () => {
    const { t, eventId, stored } = await setup()
    const food = await t.mutation(api.timeblocks.create, { eventId, sectionType: "food", title: "Dinner" })
    expect(food).toMatchObject({ isAddOn: false, packagePricePerPersonCents: null, packageQuantity: null })
    expect(await stored(food.id)).toMatchObject({ isAddOn: false, packagePricePerPersonCents: null, packageQuantity: null })
  })

  it("updates isAddOn and the package price, and clears the price with null", async () => {
    const { t, eventId, stored } = await setup()
    const food = await t.mutation(api.timeblocks.create, { eventId, sectionType: "food", title: "Late-night snack" })

    expect(await t.mutation(api.timeblocks.update, { id: food.id, updates: { isAddOn: true, packagePricePerPersonCents: 4500 } }))
      .toMatchObject({ isAddOn: true, packagePricePerPersonCents: 4500 })
    expect(await stored(food.id)).toMatchObject({ isAddOn: true, packagePricePerPersonCents: 4500 })

    expect(await t.mutation(api.timeblocks.update, { id: food.id, updates: { packagePricePerPersonCents: 0 } }))
      .toMatchObject({ isAddOn: true, packagePricePerPersonCents: 0 })
    expect(await t.mutation(api.timeblocks.update, { id: food.id, updates: { packagePricePerPersonCents: null } }))
      .toMatchObject({ isAddOn: true, packagePricePerPersonCents: null })
  })

  it.each([-1, 12.5, Number.NaN, Number.POSITIVE_INFINITY])("rejects a package price of %s", async (cents) => {
    const { t, eventId, stored } = await setup()
    const food = await t.mutation(api.timeblocks.create, { eventId, sectionType: "food", title: "Dinner" })
    await expect(t.mutation(api.timeblocks.update, { id: food.id, updates: { packagePricePerPersonCents: cents } }))
      .rejects.toThrow("packagePricePerPersonCents must be a whole number of cents")
    expect(await stored(food.id)).toMatchObject({ packagePricePerPersonCents: null })
  })

  it("updates the final package quantity and clears it with null", async () => {
    const { t, eventId, stored } = await setup()
    const food = await t.mutation(api.timeblocks.create, { eventId, sectionType: "food", title: "Dinner" })
    expect(await t.mutation(api.timeblocks.update, { id: food.id, updates: { packageQuantity: 48 } }))
      .toMatchObject({ packageQuantity: 48 })
    expect(await stored(food.id)).toMatchObject({ packageQuantity: 48 })
    expect(await t.mutation(api.timeblocks.update, { id: food.id, updates: { packageQuantity: null } }))
      .toMatchObject({ packageQuantity: null })
  })

  it.each([-1, 2.5, Number.NaN, Number.POSITIVE_INFINITY])("rejects a package quantity of %s", async (quantity) => {
    const { t, eventId, stored } = await setup()
    const food = await t.mutation(api.timeblocks.create, { eventId, sectionType: "food", title: "Dinner" })
    await expect(t.mutation(api.timeblocks.update, { id: food.id, updates: { packageQuantity: quantity } }))
      .rejects.toThrow("packageQuantity must be a whole number")
    expect(await stored(food.id)).toMatchObject({ packageQuantity: null })
  })

  it("reads timeblocks stored without them as not an add-on with no package price", async () => {
    const { t, eventId, insertLegacyTimeblock, stored } = await setup()
    const food = await insertLegacyTimeblock("food", "Dinner")
    const bar = await insertLegacyTimeblock("beverage", "Bar")
    expect(await stored(food)).not.toHaveProperty("isAddOn")
    const defaults = { isAddOn: false, packagePricePerPersonCents: null, packageQuantity: null }

    expect(await t.query(api.timeblocks.getById, { id: food })).toMatchObject(defaults)
    expect((await t.query(api.timeblocks.getByEventIdAndSectionType, { eventId, sectionType: "food" }))[0]).toMatchObject(defaults)
    expect((await t.query(api.foodItems.getByEventId, { eventId }))[0]).toMatchObject(defaults)
    expect((await t.query(api.beverageItems.getByEventId, { eventId })).timeblocks[0]).toMatchObject({ id: bar, ...defaults })
    const timeline = await t.query(api.timeblocks.getAllTimelineBlocks, { eventId, timeZone: "America/Toronto" })
    expect(timeline.find((row) => row.id === food)).toMatchObject(defaults)
    expect(await t.mutation(api.timeblocks.update, { id: food, updates: { title: "Supper" } })).toMatchObject(defaults)
    const { timeblock } = await t.mutation(api.timeblocks.convertSectionType, { timeblockId: bar, toType: "note" })
    expect(timeblock).toMatchObject(defaults)
  })

  describe("backfillEstimateFields", () => {
    afterEach(() => vi.useRealTimers())

    it("sets the defaults where they are missing, keeps stored values, and can run twice", async () => {
      const { t, eventId, insertLegacyTimeblock, stored } = await setup()
      const missing = await insertLegacyTimeblock("food", "Dinner")
      const partial = await t.run((ctx) => ctx.db.insert("timeblocks", {
        eventId, sectionType: "food", title: "Snack", time: null, details: null, assignedTo: null,
        createdAt: "1790812800000", updatedAt: null, isAddOn: true,
      }))
      const priced = await t.mutation(api.timeblocks.create, { eventId, sectionType: "food", title: "Buffet" })
      await t.mutation(api.timeblocks.update, { id: priced.id, updates: { packagePricePerPersonCents: 4500 } })

      expect(await t.mutation(internal.timeblocks.backfillEstimateFields, {})).toEqual({ migrated: 2, skipped: 1, isDone: true })
      const doc = await stored(missing)
      expect(doc).toMatchObject({ isAddOn: false, packagePricePerPersonCents: null, packageQuantity: null, updatedAt: null })
      // A migration isn't a user edit: no audit stamp.
      expect(doc).not.toHaveProperty("updatedBy")
      expect(await stored(partial)).toMatchObject({ isAddOn: true, packagePricePerPersonCents: null })
      expect(await stored(priced.id)).toMatchObject({ isAddOn: false, packagePricePerPersonCents: 4500 })

      expect(await t.mutation(internal.timeblocks.backfillEstimateFields, {})).toEqual({ migrated: 0, skipped: 3, isDone: true })
    })

    it("schedules the next batch until the whole table is done", async () => {
      vi.useFakeTimers()
      const { t, insertLegacyTimeblock, stored } = await setup()
      const ids = [
        await insertLegacyTimeblock("food", "Dinner"),
        await insertLegacyTimeblock("food", "Snack"),
        await insertLegacyTimeblock("beverage", "Bar"),
      ]

      expect(await t.mutation(internal.timeblocks.backfillEstimateFields, { batchSize: 1 }))
        .toEqual({ migrated: 1, skipped: 0, isDone: false })
      await t.finishAllScheduledFunctions(vi.runAllTimers)
      for (const id of ids) expect(await stored(id)).toMatchObject({ isAddOn: false, packagePricePerPersonCents: null })
    })
  })
})
