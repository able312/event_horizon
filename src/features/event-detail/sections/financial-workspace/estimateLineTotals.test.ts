import { describe, expect, it } from "vitest"

import type { BeverageItem, FoodItem } from "~/definitions/database"
import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import { computeEstimateLineTotal, sumEstimateLineTotals, sumEstimatePlanning } from "./estimateLineTotals"

const guests = { min: 80, max: 120 }

describe("computeEstimateLineTotal", () => {
  it("prices an each line as quantity × price, whatever the guest count", () => {
    expect(computeEstimateLineTotal({ quantity: 3, unitPriceCents: 15000, pricingBasis: "each" }, guests))
      .toEqual({ lowCents: 45000, highCents: 45000 })
    expect(computeEstimateLineTotal({ quantity: 3, unitPriceCents: 15000 }, null))
      .toEqual({ lowCents: 45000, highCents: 45000 })
  })

  it("prices a per-person line as price × guests, ignoring quantity", () => {
    expect(computeEstimateLineTotal({ quantity: 5, unitPriceCents: 4500, pricingBasis: "per_person" }, guests))
      .toEqual({ lowCents: 360000, highCents: 540000 })
  })

  it("cannot price a per-person line without a guest count", () => {
    expect(computeEstimateLineTotal({ quantity: 5, unitPriceCents: 4500, pricingBasis: "per_person" }, null)).toBeNull()
  })
})

describe("sumEstimateLineTotals", () => {
  it("adds ranges and skips unpriced lines", () => {
    expect(sumEstimateLineTotals([
      { lowCents: 100, highCents: 100 },
      null,
      { lowCents: 3600, highCents: 5400 },
    ])).toEqual({ lowCents: 3700, highCents: 5500 })
  })

  it("is zero with no lines", () => {
    expect(sumEstimateLineTotals([])).toEqual({ lowCents: 0, highCents: 0 })
  })
})

describe("sumEstimatePlanning", () => {
  const food = (overrides: Partial<FoodItem> & Pick<FoodItem, "id">): FoodItem => ({
    timeblockId: "tb",
    name: overrides.id,
    quantity: null,
    serviceStyle: null,
    clientNotes: null,
    internalNotes: null,
    unitPriceCents: null,
    ...overrides,
  })
  const dinner: TimeblockWithItems = {
    id: "dinner",
    eventId: "e1",
    title: "Dinner",
    time: null,
    details: null,
    sectionType: "food",
    assignedTo: null,
    createdAt: "0",
    updatedAt: null,
    packagePricePerPersonCents: 4500,
    foodItems: [
      food({ id: "steak", unitPriceCents: 3000, pricingBasis: "per_person" }),
      food({ id: "wings", quantity: 2, unitPriceCents: 10000, pricingBasis: "each" }),
      food({ id: "dessert", unitPriceCents: 800, pricingBasis: "per_person", isAddOn: true }),
    ],
  }
  const beverage = (overrides: Partial<BeverageItem> & Pick<BeverageItem, "id">): BeverageItem => ({
    eventId: "e1",
    name: overrides.id,
    quantity: null,
    type: "Wine",
    serviceStyle: null,
    includes: null,
    unitPriceCents: null,
    ...overrides,
  })
  const bar = beverage({ id: "bar", quantity: 1, unitPriceCents: 50000, pricingBasis: "each", isAddOn: true })
  const wine = beverage({ id: "wine", quantity: 10, unitPriceCents: 3000, pricingBasis: "each" })

  it("counts the package price and fixed items, leaving add-ons out", () => {
    expect(sumEstimatePlanning([dinner], [bar, wine], guests)).toEqual({
      food: { lowCents: 20000 + 4500 * 80, highCents: 20000 + 4500 * 120 },
      beverage: { lowCents: 30000, highCents: 30000 },
    })
  })
})
