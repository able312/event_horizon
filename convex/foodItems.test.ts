import { convexTest } from "convex-test"
import { describe, expect, it } from "vitest"

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

      expect(await t.mutation(internal.foodItems.migrateIncludesToClientNotes, {})).toEqual({ migrated: 2, skipped: 1 })
      for (const [id, clientNotes] of [[withNote, "Dressing"], [blank, null]] as const) {
        const doc = await stored(id)
        expect(doc).toMatchObject({ clientNotes, internalNotes: null })
        expect(doc).not.toHaveProperty("includes")
        // A migration isn't a user edit: no audit stamp.
        expect(doc).not.toHaveProperty("updatedBy")
      }
      expect(await stored(current.id)).toMatchObject({ clientNotes: "Medium", internalNotes: "Fire at 6:30" })

      expect(await t.mutation(internal.foodItems.migrateIncludesToClientNotes, {})).toEqual({ migrated: 0, skipped: 3 })
    })
  })
})
