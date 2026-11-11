import { convexTest } from "convex-test"
import { describe, expect, it } from "vitest"

import { api } from "./_generated/api"
import { companyIdentity } from "./lib/testIdentity"
import schema from "./schema"

const modules = import.meta.glob("./**/*.{ts,js}")

function setup() {
  return convexTest(schema, modules).withIdentity(companyIdentity)
}

describe("food templates", () => {
  it("creates a saved food item with defaults for the fields left out", async () => {
    const t = setup()
    const created = await t.mutation(api.foodTemplates.create, { name: "Caesar Salad" })
    expect(created).toMatchObject({
      name: "Caesar Salad", unitPriceCents: null, pricingBasis: "each", clientNotes: null, internalNotes: null,
      categoryIds: [], createdAt: expect.any(String), createdBy: expect.any(String),
    })
    expect(await t.query(api.foodTemplates.list, {})).toEqual([created])
  })

  it("updates and removes a saved food item", async () => {
    const t = setup()
    const { id } = await t.mutation(api.foodTemplates.create, { name: "Sliders", unitPriceCents: 450 })
    const updated = await t.mutation(api.foodTemplates.update, {
      id, updates: { unitPriceCents: 500, pricingBasis: "per_person", clientNotes: "Beef", internalNotes: "No buns for GF" },
    })
    expect(updated).toMatchObject({
      name: "Sliders", unitPriceCents: 500, pricingBasis: "per_person", clientNotes: "Beef", internalNotes: "No buns for GF",
      updatedBy: expect.any(String),
    })

    expect(await t.mutation(api.foodTemplates.remove, { id })).toBe(true)
    expect(await t.query(api.foodTemplates.list, {})).toEqual([])
  })

  it("tags a saved item with categories, dropping repeats", async () => {
    const t = setup()
    const mains = await t.mutation(api.foodMenuCategories.create, { name: "Mains" })
    const wedding = await t.mutation(api.foodMenuCategories.create, { name: "Wedding Menu" })
    const { id } = await t.mutation(api.foodTemplates.create, { name: "Prime Rib", categoryIds: [mains.id, mains.id] })
    const updated = await t.mutation(api.foodTemplates.update, { id, updates: { categoryIds: [mains.id, wedding.id] } })
    expect(updated.categoryIds).toEqual([mains.id, wedding.id])
  })

  it("rejects a deleted category", async () => {
    const t = setup()
    const apps = await t.mutation(api.foodMenuCategories.create, { name: "Apps" })
    await t.mutation(api.foodMenuCategories.remove, { id: apps.id })
    await expect(t.mutation(api.foodTemplates.create, { name: "Bruschetta", categoryIds: [apps.id] })).rejects.toThrow()
  })

  it("rejects negative or fractional prices and empty updates", async () => {
    const t = setup()
    await expect(t.mutation(api.foodTemplates.create, { name: "Soup", unitPriceCents: -1 })).rejects.toThrow()
    const { id } = await t.mutation(api.foodTemplates.create, { name: "Soup" })
    await expect(t.mutation(api.foodTemplates.update, { id, updates: { unitPriceCents: 1.5 } })).rejects.toThrow()
    await expect(t.mutation(api.foodTemplates.update, { id, updates: {} })).rejects.toThrow()
  })

  it("requires a company identity", async () => {
    const t = convexTest(schema, modules)
    await expect(t.query(api.foodTemplates.list, {})).rejects.toThrow()
    await expect(t.mutation(api.foodTemplates.create, { name: "Soup" })).rejects.toThrow()
  })
})

describe("food menu categories", () => {
  it("creates, renames and lists categories with trimmed names", async () => {
    const t = setup()
    const created = await t.mutation(api.foodMenuCategories.create, { name: "  Mains " })
    expect(created).toMatchObject({ name: "Mains", createdBy: expect.any(String) })
    const renamed = await t.mutation(api.foodMenuCategories.update, { id: created.id, updates: { name: "Entrées" } })
    expect(renamed.name).toBe("Entrées")
    expect((await t.query(api.foodMenuCategories.list, {})).map((row) => row.name)).toEqual(["Entrées"])
  })

  it("rejects a blank name", async () => {
    const t = setup()
    await expect(t.mutation(api.foodMenuCategories.create, { name: "  " })).rejects.toThrow()
    const { id } = await t.mutation(api.foodMenuCategories.create, { name: "Apps" })
    await expect(t.mutation(api.foodMenuCategories.update, { id, updates: { name: "" } })).rejects.toThrow()
  })

  it("takes a deleted category off every saved item", async () => {
    const t = setup()
    const mains = await t.mutation(api.foodMenuCategories.create, { name: "Mains" })
    const wedding = await t.mutation(api.foodMenuCategories.create, { name: "Wedding Menu" })
    await t.mutation(api.foodTemplates.create, { name: "Prime Rib", categoryIds: [mains.id, wedding.id] })
    await t.mutation(api.foodTemplates.create, { name: "Salmon", categoryIds: [wedding.id] })

    expect(await t.mutation(api.foodMenuCategories.remove, { id: wedding.id })).toBe(true)
    const templates = await t.query(api.foodTemplates.list, {})
    expect(templates.map((row) => [row.name, row.categoryIds])).toEqual([["Prime Rib", [mains.id]], ["Salmon", []]])
    expect((await t.query(api.foodMenuCategories.list, {})).map((row) => row.name)).toEqual(["Mains"])
  })

  it("requires a company identity", async () => {
    const t = convexTest(schema, modules)
    await expect(t.query(api.foodMenuCategories.list, {})).rejects.toThrow()
    await expect(t.mutation(api.foodMenuCategories.create, { name: "Mains" })).rejects.toThrow()
  })
})
