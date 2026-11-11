import { describe, expect, it } from "vitest"

import type { FoodMenuCategory, FoodTemplate } from "~/definitions/database"

import {
  categoryIdsForNewItem,
  filterFoodMenu,
  foodMenuItemFields,
  groupFoodMenu,
  toggleCategoryId,
} from "./foodMenu"

function template(overrides: Partial<FoodTemplate>): FoodTemplate {
  return {
    id: overrides.name ?? "id",
    name: "Item",
    unitPriceCents: null,
    pricingBasis: "each",
    clientNotes: null,
    internalNotes: null,
    categoryIds: [],
    createdAt: "2026-11-01T00:00:00.000Z",
    ...overrides,
  }
}

const category = (id: string, name: string): FoodMenuCategory => ({ id, name, createdAt: "2026-11-01T00:00:00.000Z" })

describe("foodMenuItemFields", () => {
  it("copies the name, price, pricing basis and both notes into the event item's fields", () => {
    const saved = template({
      name: "Sliders", unitPriceCents: 450, pricingBasis: "per_person", clientNotes: "Beef", internalNotes: "GF buns", categoryIds: ["c1"],
    })
    expect(foodMenuItemFields(saved)).toEqual({
      name: "Sliders", clientNotes: "Beef", internalNotes: "GF buns", unitPriceCents: 450, pricingBasis: "per_person",
    })
  })

  it("leaves blank notes empty", () => {
    const fields = foodMenuItemFields(template({ clientNotes: " ", internalNotes: "" }))
    expect(fields.clientNotes).toBeNull()
    expect(fields.internalNotes).toBeNull()
  })
})

describe("groupFoodMenu", () => {
  const mains = category("mains", "Mains")
  const apps = category("apps", "apps")
  const wedding = category("wedding", "Wedding Menu")
  const menu = [
    template({ name: "Salmon", categoryIds: ["mains", "wedding"] }),
    template({ name: "Bruschetta", categoryIds: ["apps"] }),
    template({ name: "Prime Rib", categoryIds: ["mains"] }),
    template({ name: "Bread", categoryIds: [] }),
    template({ name: "Soup", categoryIds: ["deleted"] }),
  ]

  it("groups by category name, puts multi-category items in each, and leaves uncategorized last", () => {
    const groups = groupFoodMenu(menu, [wedding, mains, apps, category("empty", "Desserts")])
    expect(groups.map((group) => [group.category?.name ?? null, group.templates.map((t) => t.name)])).toEqual([
      ["apps", ["Bruschetta"]],
      ["Mains", ["Prime Rib", "Salmon"]],
      ["Wedding Menu", ["Salmon"]],
      [null, ["Bread", "Soup"]],
    ])
  })

  it("leaves out the uncategorized group when everything has a category", () => {
    expect(groupFoodMenu([template({ name: "Rib", categoryIds: ["mains"] })], [mains]).map((g) => g.category?.id)).toEqual(["mains"])
  })
})

describe("filterFoodMenu", () => {
  const categories = [category("mains", "Mains")]
  const menu = [
    template({ name: "Salmon", categoryIds: ["mains"] }),
    template({ name: "", categoryIds: [] }),
    template({ name: "Bread", categoryIds: ["deleted"] }),
  ]

  it("shows everything by name, unnamed last", () => {
    expect(filterFoodMenu(menu, categories, "all").map((t) => t.name)).toEqual(["Bread", "Salmon", ""])
  })

  it("shows one category, or the items without a known category", () => {
    expect(filterFoodMenu(menu, categories, "mains").map((t) => t.name)).toEqual(["Salmon"])
    expect(filterFoodMenu(menu, categories, "none").map((t) => t.name)).toEqual(["Bread", ""])
  })
})

describe("categoryIdsForNewItem", () => {
  it("tags a new row with the filtered category only", () => {
    expect(categoryIdsForNewItem("all")).toEqual([])
    expect(categoryIdsForNewItem("none")).toEqual([])
    expect(categoryIdsForNewItem("mains")).toEqual(["mains"])
  })
})

describe("toggleCategoryId", () => {
  it("adds once and removes", () => {
    expect(toggleCategoryId(["a"], "b", true)).toEqual(["a", "b"])
    expect(toggleCategoryId(["a", "b"], "b", true)).toEqual(["a", "b"])
    expect(toggleCategoryId(["a", "b"], "a", false)).toEqual(["b"])
  })
})
