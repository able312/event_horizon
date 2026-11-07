import { describe, expect, it } from "vitest"

import type { BeverageItem, FoodItem } from "~/definitions/database"
import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import { computeAddOnSubtotal, isAddOn, splitEstimateAddOns } from "./estimateAddOns"

function food(overrides: Partial<FoodItem> & Pick<FoodItem, "id">): FoodItem {
  return {
    timeblockId: "tb",
    name: overrides.id,
    quantity: null,
    serviceStyle: null,
    clientNotes: null,
    internalNotes: null,
    unitPriceCents: null,
    ...overrides,
  }
}

function timeblock(
  id: string,
  title: string,
  items: FoodItem[],
  overrides: Partial<TimeblockWithItems> = {},
): TimeblockWithItems {
  return {
    id,
    eventId: "e1",
    title,
    time: null,
    details: null,
    sectionType: "food",
    assignedTo: null,
    createdAt: "0",
    updatedAt: null,
    foodItems: items,
    ...overrides,
  }
}

function beverage(overrides: Partial<BeverageItem> & Pick<BeverageItem, "id">): BeverageItem {
  return {
    eventId: "e1",
    name: overrides.id,
    quantity: null,
    type: "Wine",
    serviceStyle: null,
    includes: null,
    unitPriceCents: null,
    ...overrides,
  }
}

describe("isAddOn", () => {
  it("treats records saved before add-ons existed as counted", () => {
    expect(isAddOn({})).toBe(false)
    expect(isAddOn({ isAddOn: null })).toBe(false)
    expect(isAddOn({ isAddOn: true })).toBe(true)
  })
})

describe("splitEstimateAddOns", () => {
  it("leaves everything counted when nothing is an add-on", () => {
    const dinner = timeblock("dinner", "Dinner", [food({ id: "steak" })])
    const wine = beverage({ id: "wine" })
    const split = splitEstimateAddOns([dinner], [wine])
    expect(split.foodTimeblocks).toEqual([dinner])
    expect(split.beverageItems).toEqual([wine])
    expect(split.addOns).toEqual([])
  })

  it("takes add-on items out of their timeblock and prices them", () => {
    const dinner = timeblock("dinner", "Dinner", [
      food({ id: "steak" }),
      food({ id: "dessert", name: "Dessert station", unitPriceCents: 800, pricingBasis: "per_person", isAddOn: true }),
      food({ id: "wings", name: "Wings", quantity: 2, unitPriceCents: 10000, pricingBasis: "each", isAddOn: true }),
    ])
    const split = splitEstimateAddOns([dinner], [])

    expect(split.foodTimeblocks[0].foodItems?.map((item) => item.id)).toEqual(["steak"])
    expect(split.addOns).toEqual([
      { key: "food-dessert", name: "Dessert station", includes: [], fixedCents: 0, perPersonRateCents: 800 },
      { key: "food-wings", name: "Wings", includes: [], fixedCents: 20000, perPersonRateCents: 0 },
    ])
  })

  it("offers a whole add-on timeblock as one add-on, with its package price", () => {
    const snack = timeblock(
      "snack",
      "Late-night snack",
      [
        food({ id: "poutine", name: "Poutine", unitPriceCents: 600, pricingBasis: "per_person" }),
        food({ id: "pizza", name: "Pizza", quantity: 5, unitPriceCents: 2000, pricingBasis: "each" }),
      ],
      { isAddOn: true, packagePricePerPersonCents: 900 },
    )
    const split = splitEstimateAddOns([snack], [])

    expect(split.foodTimeblocks).toEqual([])
    expect(split.addOns).toEqual([
      { key: "timeblock-snack", name: "Late-night snack", includes: ["Poutine", "Pizza"], fixedCents: 10000, perPersonRateCents: 900 },
    ])
  })

  it("keeps an item flagged on its own separate from its add-on timeblock", () => {
    const dinner = timeblock(
      "dinner",
      "Dinner",
      [
        food({ id: "main", name: "Main", quantity: 1, unitPriceCents: 10000, pricingBasis: "each" }),
        food({ id: "dessert", name: "Dessert", quantity: 1, unitPriceCents: 2000, pricingBasis: "each", isAddOn: true }),
      ],
      { isAddOn: true },
    )
    const offered = splitEstimateAddOns([dinner], [])
    expect(offered.addOns).toEqual([
      { key: "timeblock-dinner", name: "Dinner", includes: ["Main"], fixedCents: 10000, perPersonRateCents: 0 },
      { key: "food-dessert", name: "Dessert", includes: [], fixedCents: 2000, perPersonRateCents: 0 },
    ])

    // Accepting the timeblock bills what it offered; the dessert is still optional.
    const accepted = splitEstimateAddOns([{ ...dinner, isAddOn: false }], [])
    expect(accepted.foodTimeblocks[0].foodItems?.map((item) => item.id)).toEqual(["main"])
    expect(accepted.addOns.map((addOn) => addOn.key)).toEqual(["food-dessert"])
  })

  it("takes add-on beverages out, after the food add-ons", () => {
    const dinner = timeblock("dinner", "Dinner", [food({ id: "cake", isAddOn: true, quantity: 1, unitPriceCents: 5000 })])
    const bar = beverage({ id: "bar", name: "Bar upgrade", unitPriceCents: 1200, pricingBasis: "per_person", isAddOn: true })
    const wine = beverage({ id: "wine" })
    const split = splitEstimateAddOns([dinner], [bar, wine])

    expect(split.beverageItems).toEqual([wine])
    expect(split.addOns.map((addOn) => addOn.key)).toEqual(["food-cake", "beverage-bar"])
  })
})

describe("computeAddOnSubtotal", () => {
  it("adds the per-person rate × guests to the fixed part", () => {
    expect(computeAddOnSubtotal({ fixedCents: 10000, perPersonRateCents: 900 }, { min: 50, max: 80 }))
      .toEqual({ lowCents: 55000, highCents: 82000 })
  })

  it("leaves per-person pricing out without a guest count", () => {
    expect(computeAddOnSubtotal({ fixedCents: 10000, perPersonRateCents: 900 }, null))
      .toEqual({ lowCents: 10000, highCents: 10000 })
  })
})
