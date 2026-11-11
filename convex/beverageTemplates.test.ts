import { convexTest } from "convex-test"
import { describe, expect, it } from "vitest"

import { api } from "./_generated/api"
import { companyIdentity } from "./lib/testIdentity"
import schema from "./schema"

const modules = import.meta.glob("./**/*.{ts,js}")

function setup() {
  return convexTest(schema, modules).withIdentity(companyIdentity)
}

describe("beverage templates", () => {
  it("creates a saved beverage with defaults for the fields left out", async () => {
    const t = setup()
    const created = await t.mutation(api.beverageTemplates.create, { name: "Bud Light", type: "Beer" })
    expect(created).toMatchObject({
      name: "Bud Light", type: "Beer", unitPriceCents: null, pricingBasis: "each", notes: null,
      createdAt: expect.any(String), createdBy: expect.any(String),
    })
    expect(await t.query(api.beverageTemplates.list, {})).toEqual([created])
  })

  it("updates and removes a saved beverage", async () => {
    const t = setup()
    const { id } = await t.mutation(api.beverageTemplates.create, { name: "Red Wine", type: "Wine", unitPriceCents: 900 })
    const updated = await t.mutation(api.beverageTemplates.update, {
      id, updates: { unitPriceCents: 1100, pricingBasis: "per_person", notes: "House red" },
    })
    expect(updated).toMatchObject({ name: "Red Wine", unitPriceCents: 1100, pricingBasis: "per_person", notes: "House red" })

    expect(await t.mutation(api.beverageTemplates.remove, { id })).toBe(true)
    expect(await t.query(api.beverageTemplates.list, {})).toEqual([])
  })

  it("lists saved beverages oldest first", async () => {
    const t = setup()
    await t.mutation(api.beverageTemplates.create, { name: "Gin", type: "Rails" })
    await t.mutation(api.beverageTemplates.create, { name: "Cola", type: "Non-Alcoholic" })
    expect((await t.query(api.beverageTemplates.list, {})).map((row) => row.name)).toEqual(["Gin", "Cola"])
  })

  it("rejects negative or fractional prices and empty updates", async () => {
    const t = setup()
    await expect(t.mutation(api.beverageTemplates.create, { name: "Gin", type: "Rails", unitPriceCents: -1 })).rejects.toThrow()
    const { id } = await t.mutation(api.beverageTemplates.create, { name: "Gin", type: "Rails" })
    await expect(t.mutation(api.beverageTemplates.update, { id, updates: { unitPriceCents: 1.5 } })).rejects.toThrow()
    await expect(t.mutation(api.beverageTemplates.update, { id, updates: {} })).rejects.toThrow()
  })

  it("requires a company identity", async () => {
    const t = convexTest(schema, modules)
    await expect(t.query(api.beverageTemplates.list, {})).rejects.toThrow()
    await expect(t.mutation(api.beverageTemplates.create, { name: "Gin", type: "Rails" })).rejects.toThrow()
  })
})
