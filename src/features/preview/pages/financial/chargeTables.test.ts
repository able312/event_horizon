import { describe, expect, it } from "vitest"

import type { MenuOfChargeItem } from "~/definitions/database"
import {
  buildChargeTableSpecs,
  buildEstimateFoodRows,
  formatChargeRowCells,
  groupChargeItemsByCategory,
} from "./chargeTables"

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

describe("buildEstimateFoodRows", () => {
  const base = {
    eventId: "e1",
    time: null,
    details: null,
    sectionType: "food" as const,
    assignedTo: null,
    createdAt: "0",
    updatedAt: null,
  }
  const item = (id: string, pricingBasis: "each" | "per_person", quantity: number | null, unitPriceCents: number | null) => ({
    id,
    timeblockId: "tb",
    name: id,
    quantity,
    unitPriceCents,
    pricingBasis,
    serviceStyle: null,
    clientNotes: null,
    internalNotes: null,
  })

  it("lists each timeblock's priced items", () => {
    const rows = buildEstimateFoodRows([
      { ...base, id: "lunch", title: "Lunch", foodItems: [item("soup", "per_person", null, 900), item("bread", "each", null, 500)] },
    ])
    expect(rows.map((row) => row.id)).toEqual(["soup"])
  })

  it("prints a package price as one per-person line, keeping fixed-price items", () => {
    const rows = buildEstimateFoodRows([
      {
        ...base,
        id: "dinner",
        title: "Dinner",
        packagePricePerPersonCents: 4500,
        foodItems: [item("steak", "per_person", null, 3000), item("wings", "each", 4, 10000)],
      },
    ])
    expect(rows).toEqual([
      { id: "package-price-dinner", name: "Dinner", unitPriceCents: 4500, quantity: null, pricingBasis: "per_person" },
      expect.objectContaining({ id: "wings" }),
    ])
  })
})
