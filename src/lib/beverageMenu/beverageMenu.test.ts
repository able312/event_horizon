import { describe, expect, it } from "vitest"

import type { BeverageTemplate } from "~/definitions/database"

import { beverageMenuItemFields, groupBeverageMenu } from "./beverageMenu"

function template(overrides: Partial<BeverageTemplate>): BeverageTemplate {
  return {
    id: overrides.name ?? "id",
    name: "Item",
    type: "Beer",
    unitPriceCents: null,
    pricingBasis: "each",
    notes: null,
    createdAt: "2026-11-01T00:00:00.000Z",
    ...overrides,
  }
}

describe("beverageMenuItemFields", () => {
  it("copies the name, price, pricing basis and note into the event item's fields", () => {
    const saved = template({ name: "Red Wine", unitPriceCents: 900, pricingBasis: "per_person", notes: "House red" })
    expect(beverageMenuItemFields(saved)).toEqual({
      name: "Red Wine", includes: "House red", unitPriceCents: 900, pricingBasis: "per_person",
    })
  })

  it("leaves the note empty when the saved note is blank", () => {
    expect(beverageMenuItemFields(template({ notes: "  " })).includes).toBeNull()
  })
})

describe("groupBeverageMenu", () => {
  const menu = [
    template({ name: "Vodka", type: "Rails" }),
    template({ name: "budlight", type: "Beer" }),
    template({ name: "Gin", type: "Rails" }),
    template({ name: "", type: "Rails" }),
    template({ name: "Coors", type: "Beer" }),
  ]

  it("groups by beverage type order and sorts by name, unnamed last", () => {
    expect(groupBeverageMenu(menu).map((group) => [group.type, group.templates.map((t) => t.name)])).toEqual([
      ["Beer", ["budlight", "Coors"]],
      ["Rails", ["Gin", "Vodka", ""]],
    ])
  })

  it("keeps empty types (except Special Orders) when asked", () => {
    expect(groupBeverageMenu([], { includeEmpty: true }).map((group) => group.type))
      .toEqual(["Beer", "Wine", "Coolers", "Rails", "Non-Alcoholic"])
  })

  it("shows Special Orders once something is saved there", () => {
    const groups = groupBeverageMenu([template({ name: "Champagne", type: "Special Orders" })], { includeEmpty: true })
    expect(groups[0].type).toBe("Special Orders")
  })

  it("does not reorder the input", () => {
    const input = [...menu]
    groupBeverageMenu(input)
    expect(input).toEqual(menu)
  })
})
