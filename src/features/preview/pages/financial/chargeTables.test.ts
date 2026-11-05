import { describe, expect, it } from "vitest"

import type { MenuOfChargeItem } from "~/definitions/database"
import { buildChargeTableSpecs, groupChargeItemsByCategory } from "./chargeTables"

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
    const pkg = { key: "p", name: "Package", totalCents: 100 }
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
