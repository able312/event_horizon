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
  const bar = await t.mutation(api.timeblocks.create, { eventId, sectionType: "beverage", title: "Bar", time: "18:00" })
  /** An item as stored before the pricing basis existed. */
  const insertLegacyItem = (name: string) => t.run((ctx) => ctx.db.insert("beverageItems", {
    eventId, name, quantity: null, type: "Beer", serviceStyle: null, includes: null, unitPriceCents: null,
  }))
  const stored = (id: Id<"beverageItems">) => t.run((ctx) => ctx.db.get("beverageItems", id))
  return { t, eventId, bar, insertLegacyItem, stored }
}

describe("beverage item pricing basis", () => {
  it("saves and updates the pricing basis", async () => {
    const { t, eventId, bar, stored } = await setup()
    const item = await t.mutation(api.beverageItems.create, { eventId, name: "Open bar", type: "Rails", pricingBasis: "per_person" })
    expect(item).toMatchObject({ pricingBasis: "per_person" })
    expect(await t.mutation(api.beverageItems.update, { id: item.id, updates: { pricingBasis: "each" } }))
      .toMatchObject({ pricingBasis: "each" })
    expect(await stored(item.id)).toMatchObject({ pricingBasis: "each" })

    const assigned = await t.mutation(api.beverageItems.createAssignedToTimeblock, {
      eventId, timeblockId: bar.id, name: "Wine service", type: "Wine", pricingBasis: "per_person",
    })
    expect(assigned).toMatchObject({ pricingBasis: "per_person", assignedTimeblockIds: [bar.id] })
  })

  it("stores \"per_person\" when an item is created without one", async () => {
    const { t, eventId, bar, stored } = await setup()
    const item = await t.mutation(api.beverageItems.create, { eventId, name: "Keg", type: "Beer", quantity: 1 })
    expect(item).toMatchObject({ pricingBasis: "per_person" })
    expect(await stored(item.id)).toMatchObject({ pricingBasis: "per_person" })
    const assigned = await t.mutation(api.beverageItems.createAssignedToTimeblock, { eventId, timeblockId: bar.id, name: "Cider", type: "Coolers" })
    expect(await stored(assigned.id)).toMatchObject({ pricingBasis: "per_person" })
    expect(await t.mutation(api.beverageItems.update, { id: item.id, updates: { quantity: 2 } })).toMatchObject({ pricingBasis: "per_person" })
  })

  it("reads items stored without one as \"each\"", async () => {
    const { t, eventId, bar, insertLegacyItem, stored } = await setup()
    const id = await insertLegacyItem("Lager")
    expect(await stored(id)).not.toHaveProperty("pricingBasis")
    await t.mutation(api.beverageItems.setItemTimeblocks, { itemId: id, timeblockIds: [bar.id] })

    const section = await t.query(api.beverageItems.getByEventId, { eventId })
    expect(section.items[0]).toMatchObject({ pricingBasis: "each" })
    const focused = await t.query(api.timeblocks.getById, { id: bar.id })
    expect(focused?.beverageItems[0]).toMatchObject({ pricingBasis: "each" })
    expect(await t.mutation(api.beverageItems.update, { id, updates: { name: "Pilsner" } })).toMatchObject({ pricingBasis: "each" })
  })

  describe("backfillPricingBasis", () => {
    afterEach(() => vi.useRealTimers())

    it("sets \"each\" where it is missing, skips items that have one, and can run twice", async () => {
      const { t, eventId, insertLegacyItem, stored } = await setup()
      const missing = await insertLegacyItem("Lager")
      const perPerson = await t.mutation(api.beverageItems.create, { eventId, name: "Open bar", type: "Rails", pricingBasis: "per_person" })

      expect(await t.mutation(internal.beverageItems.backfillPricingBasis, {})).toEqual({ migrated: 1, skipped: 1, isDone: true })
      const doc = await stored(missing)
      expect(doc).toMatchObject({ pricingBasis: "each" })
      // A migration isn't a user edit: no audit stamp.
      expect(doc).not.toHaveProperty("updatedBy")
      expect(await stored(perPerson.id)).toMatchObject({ pricingBasis: "per_person" })

      expect(await t.mutation(internal.beverageItems.backfillPricingBasis, {})).toEqual({ migrated: 0, skipped: 2, isDone: true })
    })

    it("schedules the next batch until the whole table is done", async () => {
      vi.useFakeTimers()
      const { t, insertLegacyItem, stored } = await setup()
      const ids = [await insertLegacyItem("Lager"), await insertLegacyItem("Stout"), await insertLegacyItem("Cider")]

      expect(await t.mutation(internal.beverageItems.backfillPricingBasis, { batchSize: 1 })).toEqual({ migrated: 1, skipped: 0, isDone: false })
      await t.finishAllScheduledFunctions(vi.runAllTimers)
      for (const id of ids) expect(await stored(id)).toMatchObject({ pricingBasis: "each" })
    })
  })
})

describe("beverage item add-ons", () => {
  it("saves and updates isAddOn", async () => {
    const { t, eventId, bar, stored } = await setup()
    const item = await t.mutation(api.beverageItems.create, { eventId, name: "Champagne toast", type: "Wine", isAddOn: true })
    expect(item).toMatchObject({ isAddOn: true })
    expect(await t.mutation(api.beverageItems.update, { id: item.id, updates: { isAddOn: false } })).toMatchObject({ isAddOn: false })
    expect(await stored(item.id)).toMatchObject({ isAddOn: false })

    const assigned = await t.mutation(api.beverageItems.createAssignedToTimeblock, {
      eventId, timeblockId: bar.id, name: "Espresso bar", type: "Non-Alcoholic", isAddOn: true,
    })
    expect(assigned).toMatchObject({ isAddOn: true, assignedTimeblockIds: [bar.id] })
  })

  it("stores false when an older build creates an item without it", async () => {
    const { t, eventId, bar, stored } = await setup()
    const item = await t.mutation(api.beverageItems.create, { eventId, name: "Keg", type: "Beer" })
    expect(item).toMatchObject({ isAddOn: false })
    expect(await stored(item.id)).toMatchObject({ isAddOn: false })
    const assigned = await t.mutation(api.beverageItems.createAssignedToTimeblock, { eventId, timeblockId: bar.id, name: "Cider", type: "Coolers" })
    expect(await stored(assigned.id)).toMatchObject({ isAddOn: false })
  })

  it("reads items stored without it as false", async () => {
    const { t, eventId, bar, insertLegacyItem, stored } = await setup()
    const id = await insertLegacyItem("Lager")
    expect(await stored(id)).not.toHaveProperty("isAddOn")
    await t.mutation(api.beverageItems.setItemTimeblocks, { itemId: id, timeblockIds: [bar.id] })

    const section = await t.query(api.beverageItems.getByEventId, { eventId })
    expect(section.items[0]).toMatchObject({ isAddOn: false })
    const focused = await t.query(api.timeblocks.getById, { id: bar.id })
    expect(focused?.beverageItems[0]).toMatchObject({ isAddOn: false })
    expect(await t.mutation(api.beverageItems.update, { id, updates: { name: "Pilsner" } })).toMatchObject({ isAddOn: false })
  })

  describe("backfillAddOn", () => {
    afterEach(() => vi.useRealTimers())

    it("sets false where it is missing, skips items that have it, and can run twice", async () => {
      const { t, eventId, insertLegacyItem, stored } = await setup()
      const missing = await insertLegacyItem("Lager")
      const addOn = await t.mutation(api.beverageItems.create, { eventId, name: "Champagne toast", type: "Wine", isAddOn: true })

      expect(await t.mutation(internal.beverageItems.backfillAddOn, {})).toEqual({ migrated: 1, skipped: 1, isDone: true })
      const doc = await stored(missing)
      expect(doc).toMatchObject({ isAddOn: false })
      expect(doc).not.toHaveProperty("updatedBy")
      expect(await stored(addOn.id)).toMatchObject({ isAddOn: true })

      expect(await t.mutation(internal.beverageItems.backfillAddOn, {})).toEqual({ migrated: 0, skipped: 2, isDone: true })
    })

    it("schedules the next batch until the whole table is done", async () => {
      vi.useFakeTimers()
      const { t, insertLegacyItem, stored } = await setup()
      const ids = [await insertLegacyItem("Lager"), await insertLegacyItem("Stout"), await insertLegacyItem("Cider")]

      expect(await t.mutation(internal.beverageItems.backfillAddOn, { batchSize: 1 })).toEqual({ migrated: 1, skipped: 0, isDone: false })
      await t.finishAllScheduledFunctions(vi.runAllTimers)
      for (const id of ids) expect(await stored(id)).toMatchObject({ isAddOn: false })
    })
  })
})
