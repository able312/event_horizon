import { describe, expect, it } from "vitest"

import type { MenuOfChargeItem } from "~/definitions/database"
import { buildChargeTableSpecs, formatChargeRowCells, groupChargeItemsByCategory } from "./chargeTables"

const charge = (id: string, category: string | null) =>
  ({ id, category, name: id, quantity: 1, unitPriceCents: 100 }) as unknown as MenuOfChargeItem

const empty = { billableFoodRows: [], billableBeverageRows: [], foodPackageRows: [] }

describe("groupChargeItemsByCategory", () => {
  it("groups by category and puts uncategorised items under Other", () => {
    const grouped = groupChargeItemsByCategory([charge("a", "Golf"), charge("b", null), charge("c", "Golf")])
    expect(Object.keys(grouped).sort()).toEqual(["Golf", "Other"])
    expect(grouped.Golf.map((item) => item.id)).toEqual(["a", "c"])
    expect(grouped.Other.map((item) => item.id)).toEqual(["b"])
  })

  it("returns an empty record for no items", () => {
    expect(groupChargeItemsByCategory(undefined)).toEqual({})
  })
})

describe("buildChargeTableSpecs", () => {
  it("orders tables by category, skips empty ones and prints Other last", () => {
    const specs = buildChargeTableSpecs({
      ...empty,
      chargeItemsByCategory: groupChargeItemsByCategory([
        charge("o", null),
        charge("s", "Service"),
        charge("v", "Venue"),
      ]),
    })
    expect(specs.map((spec) => spec.title)).toEqual(["Venue", "Service", "Other"])
  })

  it("adds Food & Beverage when only food, beverage or package rows exist", () => {
    const row = { id: "f", name: "Food", quantity: 1, unitPriceCents: 100 }
    const pkg = { key: "p", name: "Package", lowCents: 100, highCents: 100 }
    for (const params of [
      { ...empty, billableFoodRows: [row] },
      { ...empty, billableBeverageRows: [row] },
      { ...empty, foodPackageRows: [pkg] },
    ]) {
      const specs = buildChargeTableSpecs({ ...params, chargeItemsByCategory: {} })
      expect(specs.map((spec) => spec.id)).toEqual(["financial-table-food-beverage"])
    }
    expect(buildChargeTableSpecs({ ...empty, chargeItemsByCategory: {} })).toEqual([])
  })
})

describe("formatChargeRowCells", () => {
  const perPerson = { quantity: 3, unitPriceCents: 4500, pricingBasis: "per_person" as const }

  it("prints quantity × price, with blank cells for missing values", () => {
    expect(formatChargeRowCells({ quantity: 2, unitPriceCents: 1500 })).toEqual({
      cost: "$15.00",
      quantity: "2",
      total: "$30.00",
    })
    expect(formatChargeRowCells({ quantity: 0, unitPriceCents: 1500 }, { min: 10, max: 20 })).toEqual({
      cost: "$15.00",
      quantity: "",
      total: "",
    })
  })

  it("prices a per-person line as quantity × price when no guest range is given (invoice)", () => {
    expect(formatChargeRowCells(perPerson)).toEqual({ cost: "$45.00", quantity: "3", total: "$135.00" })
  })

  it("prints a per-person rate across the guest range on the estimate", () => {
    expect(formatChargeRowCells(perPerson, { min: 80, max: 120 })).toEqual({
      cost: "$45.00 per person × 80–120 guests",
      quantity: null,
      total: "$3,600.00 – $5,400.00",
    })
    expect(formatChargeRowCells(perPerson, { min: 80, max: 80 })).toEqual({
      cost: "$45.00 per person × 80 guests",
      quantity: null,
      total: "$3,600.00",
    })
  })

  it("shows a per-person line with no dollar total when the event has no guest count", () => {
    expect(formatChargeRowCells(perPerson, null)).toEqual({ cost: "$45.00", quantity: "", total: "per person" })
  })
})
