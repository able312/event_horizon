import { describe, expect, it } from "vitest"

import type { BeverageItem, FoodItem, MenuOfChargeItem } from "~/definitions/database"
import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import {
  computeEstimateSummaryRange,
  computeFinancialSummaryAllSources,
} from "~/features/event-detail/workspace/lib/financial"

import {
  buildFoodPackageEstimateRows,
  computeFoodChargeBreakdown,
  formatCurrencyRange,
  computeFoodPackageEstimate,
  computeFoodPackageSubtotalCents,
  formatGuestCountRange,
  resolveGuestCountRange,
  splitFoodPackageTimeblocks,
  summarizeFoodPackage,
} from "./foodPackages"

function makeFoodItem(overrides: Partial<FoodItem> & Pick<FoodItem, "id" | "timeblockId">): FoodItem {
  return {
    name: overrides.id,
    quantity: null,
    serviceStyle: null,
    clientNotes: null,
    internalNotes: null,
    unitPriceCents: null,
    ...overrides,
  }
}

function makeTimeblock(id: string, title: string, items: Array<Omit<Partial<FoodItem>, "timeblockId"> & Pick<FoodItem, "id">>): TimeblockWithItems {
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
    foodItems: items.map((item) => makeFoodItem({ ...item, timeblockId: id })),
  }
}

function makeMenuItem(id: string, quantity: number, unitPriceCents: number): MenuOfChargeItem {
  return { id, eventId: "e1", name: id, quantity, category: "Venue", includes: null, unitPriceCents, createdAt: "0" }
}

function makeBeverageItem(
  id: string,
  quantity: number,
  unitPriceCents: number,
  pricingBasis?: BeverageItem["pricingBasis"],
): BeverageItem {
  return {
    pricingBasis,
    id,
    eventId: "e1",
    name: id,
    quantity,
    type: "Beer",
    serviceStyle: null,
    includes: null,
    unitPriceCents,
  }
}

// Package A: 80 × 2500 + 2 × 20000 = 240000
const packageA = makeTimeblock("pkg-a", "Package A", [
  { id: "a1", name: "Steak", quantity: 80, unitPriceCents: 2500 },
  { id: "a2", name: "Carving station", quantity: 2, unitPriceCents: 20000 },
])
// Package B: 50 × 2000 = 100000
const packageB = makeTimeblock("pkg-b", "Package B", [{ id: "b1", name: "Pasta", quantity: 50, unitPriceCents: 2000 }])
// Package C: 80 × 2000 = 160000
const packageC = makeTimeblock("pkg-c", "Package C", [{ id: "c1", name: "Chicken", quantity: 80, unitPriceCents: 2000 }])
// Certain (non-package) food: 10 × 1500 = 15000
const lateSnack = makeTimeblock("snack", "Late snack", [{ id: "s1", name: "Poutine", quantity: 10, unitPriceCents: 1500 }])

const foodTimeblocks = [packageA, lateSnack, packageB, packageC]
const menuItems = [makeMenuItem("m1", 1, 50000)] // 50000
const beverageItems = [makeBeverageItem("bev1", 20, 700)] // 14000

describe("resolveGuestCountRange", () => {
  it("returns null when neither end is a usable count", () => {
    expect(resolveGuestCountRange(null)).toBeNull()
    expect(resolveGuestCountRange(undefined)).toBeNull()
    expect(resolveGuestCountRange({ minGuests: null, maxGuests: null })).toBeNull()
    expect(resolveGuestCountRange({ minGuests: 0, maxGuests: 0 })).toBeNull()
    expect(resolveGuestCountRange({ minGuests: -5, maxGuests: Number.NaN })).toBeNull()
    expect(resolveGuestCountRange({ minGuests: Number.POSITIVE_INFINITY, maxGuests: -1 })).toBeNull()
  })

  it("uses the one known end for both", () => {
    expect(resolveGuestCountRange({ minGuests: 80, maxGuests: null })).toEqual({ min: 80, max: 80 })
    expect(resolveGuestCountRange({ minGuests: null, maxGuests: 120 })).toEqual({ min: 120, max: 120 })
    expect(resolveGuestCountRange({ minGuests: 0, maxGuests: 50 })).toEqual({ min: 50, max: 50 })
    expect(resolveGuestCountRange({ minGuests: 40, maxGuests: Number.NaN })).toEqual({ min: 40, max: 40 })
  })

  it("swaps a reversed range and floors fractional counts", () => {
    expect(resolveGuestCountRange({ minGuests: 150, maxGuests: 100 })).toEqual({ min: 100, max: 150 })
    expect(resolveGuestCountRange({ minGuests: 79.9, maxGuests: 100.6 })).toEqual({ min: 79, max: 100 })
  })

  it("uses the max alone once the count is final", () => {
    expect(resolveGuestCountRange({ minGuests: 80, maxGuests: 110, guestCountFinal: 1 })).toEqual({ min: 110, max: 110 })
    expect(resolveGuestCountRange({ minGuests: 80, maxGuests: 110, guestCountFinal: 0 })).toEqual({ min: 80, max: 110 })
    // No max to be final about: fall back to the min
    expect(resolveGuestCountRange({ minGuests: 80, maxGuests: null, guestCountFinal: 1 })).toEqual({ min: 80, max: 80 })
  })
})

describe("computeFoodChargeBreakdown", () => {
  it("adds HST and pre-tax gratuity to a whole-cent subtotal", () => {
    // 10000: HST 1300, gratuity 1800, total 13100
    expect(computeFoodChargeBreakdown(10000)).toEqual({
      subtotalCents: 10000,
      hstCents: 1300,
      gratuityCents: 1800,
      totalCents: 13100,
    })
    // 12345: HST round(1604.85) = 1605, gratuity round(2222.1) = 2222, total 16172
    expect(computeFoodChargeBreakdown(12345)).toEqual({
      subtotalCents: 12345,
      hstCents: 1605,
      gratuityCents: 2222,
      totalCents: 16172,
    })
  })

  it("rounds each part of a fractional-cent subtotal once", () => {
    // 10000/3 = 3333.33…: subtotal 3333, HST round(433.33) = 433, gratuity round(600) = 600, total 4366
    expect(computeFoodChargeBreakdown(10000 / 3)).toEqual({
      subtotalCents: 3333,
      hstCents: 433,
      gratuityCents: 600,
      totalCents: 4366,
    })
  })
})

describe("summarizeFoodPackage", () => {
  const withUnpriced = makeTimeblock("pkg-x", "Package X", [
    { id: "x1", name: "Steak", quantity: 80, unitPriceCents: 2500 }, // 200000
    { id: "x2", name: "Carving station", quantity: 2, unitPriceCents: 20000 }, // 40000
    { id: "x3", name: "Cake", quantity: null, unitPriceCents: 500 },
    { id: "x4", name: "Water", quantity: 10, unitPriceCents: 0 },
    { id: "x5", name: "Mints", quantity: 0, unitPriceCents: 100 },
    { id: "x6", name: "Bread", quantity: 5, unitPriceCents: null },
  ])

  it("totals priced items, lists unpriced ones, and prices per person across a guest range", () => {
    const summary = summarizeFoodPackage(withUnpriced, { min: 80, max: 100 })

    expect(summary.timeblockId).toBe("pkg-x")
    expect(summary.title).toBe("Package X")
    // 240000: HST 31200, gratuity 43200, total 314400
    const whole = { subtotalCents: 240000, hstCents: 31200, gratuityCents: 43200, totalCents: 314400 }
    expect(summary.totals).toEqual({ low: whole, high: whole })
    expect(summary.eachSubtotalCents).toBe(240000)
    expect(summary.perPersonRateCents).toBe(0)
    expect(summary.unpricedItemNames).toEqual(["Cake", "Water", "Mints", "Bread"])
    expect(summary.perPerson).toEqual({
      guests: { min: 80, max: 100 },
      // 240000 / 100 = 2400: HST 312, gratuity 432, total 3144
      atMaxGuests: { subtotalCents: 2400, hstCents: 312, gratuityCents: 432, totalCents: 3144 },
      // 240000 / 80 = 3000: HST 390, gratuity 540, total 3930
      atMinGuests: { subtotalCents: 3000, hstCents: 390, gratuityCents: 540, totalCents: 3930 },
    })
  })

  it("uses the same per-person figure for a fixed guest count", () => {
    // 100000 / 30 = 3333.33…: 3333 + 433 + 600 = 4366
    const summary = summarizeFoodPackage(packageB, { min: 30, max: 30 })
    const perHead = { subtotalCents: 3333, hstCents: 433, gratuityCents: 600, totalCents: 4366 }
    expect(summary.perPerson?.atMaxGuests).toEqual(perHead)
    expect(summary.perPerson?.atMinGuests).toEqual(perHead)
    expect(summary.unpricedItemNames).toEqual([])
  })

  it("has no per-person pricing without a guest count", () => {
    expect(summarizeFoodPackage(packageB, null).perPerson).toBeNull()
  })

  it("prices per person by the package price, keeping fixed-price items like platters on top", () => {
    const priced = {
      ...makeTimeblock("pkg-p", "Package P", [
        { id: "p1", name: "Wings platter", quantity: 4, unitPriceCents: 10000, pricingBasis: "each" }, // 40000
        { id: "p2", name: "Salad", quantity: null, unitPriceCents: 800, pricingBasis: "per_person" },
        { id: "p3", name: "Chicken", quantity: null, unitPriceCents: null, pricingBasis: "per_person" },
      ]),
      packagePricePerPersonCents: 4500,
    }
    const summary = summarizeFoodPackage(priced, { min: 25, max: 50 })

    expect(summary.packagePricePerPersonCents).toBe(4500)
    expect(summary.perPersonRateCents).toBe(4500)
    expect(summary.eachSubtotalCents).toBe(40000)
    // 40000 + 4500 × 25 = 152500; 40000 + 4500 × 50 = 265000
    expect(summary.totals.low.subtotalCents).toBe(152500)
    expect(summary.totals.high.subtotalCents).toBe(265000)
    // The chicken has no price of its own, but the package price covers it.
    expect(summary.unpricedItemNames).toEqual([])
  })
})

describe("package price in the estimate totals", () => {
  const priced = {
    ...makeTimeblock("dinner", "Dinner", [
      { id: "d1", name: "Wings platter", quantity: 4, unitPriceCents: 10000, pricingBasis: "each" },
      { id: "d2", name: "Buffet", quantity: 50, unitPriceCents: 3000, pricingBasis: "per_person" },
    ]),
    packagePricePerPersonCents: 4500,
  }

  it("replaces per-person items with the package price × guests on the estimate", () => {
    const range = computeEstimateSummaryRange({ menuItems: [], foodTimeblocks: [priced], beverageItems: [], guests: { min: 25, max: 50 } })
    expect(range.low.foodSubtotalCents).toBe(40000 + 4500 * 25)
    expect(range.high.foodSubtotalCents).toBe(40000 + 4500 * 50)
  })

  it("keeps only the fixed-price items without a guest count", () => {
    const range = computeEstimateSummaryRange({ menuItems: [], foodTimeblocks: [priced], beverageItems: [], guests: null })
    expect(range.low.foodSubtotalCents).toBe(40000)
  })

  it("bills the package price × its final quantity on the invoice, in place of the items it covers", () => {
    const summary = computeFinancialSummaryAllSources({
      menuItems: [],
      foodTimeblocks: [{ ...priced, packageQuantity: 48 }],
      beverageItems: [],
    })
    // Platters 2 × $100 + $45 × 48; the buffet's own 50 × $30 is not billed.
    expect(summary.foodSubtotalCents).toBe(40000 + 4500 * 48)
  })

  it("bills nothing for a package price until its final quantity is set, never guessing", () => {
    const summary = computeFinancialSummaryAllSources({ menuItems: [], foodTimeblocks: [priced], beverageItems: [] })
    expect(summary.foodSubtotalCents).toBe(40000)
  })
})

describe("splitFoodPackageTimeblocks", () => {
  it("treats every timeblock as certain when no packages are chosen", () => {
    expect(splitFoodPackageTimeblocks(foodTimeblocks, null)).toEqual({ packages: [], certain: foodTimeblocks })
    expect(splitFoodPackageTimeblocks(foodTimeblocks, [])).toEqual({ packages: [], certain: foodTimeblocks })
    expect(splitFoodPackageTimeblocks(undefined, ["pkg-a"])).toEqual({ packages: [], certain: [] })
  })

  it("partitions in timeblock order and ignores unknown ids", () => {
    const { packages, certain } = splitFoodPackageTimeblocks(foodTimeblocks, ["pkg-c", "missing", "pkg-a"])
    expect(packages.map((tb) => tb.id)).toEqual(["pkg-a", "pkg-c"])
    expect(certain.map((tb) => tb.id)).toEqual(["snack", "pkg-b"])
  })
})

describe("computeFoodPackageEstimate", () => {
  const base = { menuItems, foodTimeblocks, beverageItems }
  const packageTimeblockIds = ["pkg-c", "pkg-a", "pkg-b"]

  it("is the plain summary over all food when no packages are chosen, whatever the mode", () => {
    const plain = computeFinancialSummaryAllSources(base)
    // food 15000 + 240000 + 100000 + 160000 = 515000; charges 579000; gratuity round(529000 × 0.18) = 95220;
    // HST round(579000 × 0.13) = 75270; grand 579000 + 75270 + 95220 = 749490
    expect(plain.grandTotalCents).toBe(749490)

    for (const mode of ["ignore", "average", "list"] as const) {
      for (const ids of [null, []]) {
        const estimate = computeFoodPackageEstimate({ ...base, packageTimeblockIds: ids, mode, guests: null })
        expect(estimate.packages).toEqual([])
        expect(estimate.low).toEqual(plain)
        expect(estimate.high).toEqual(plain)
      }
    }
  })

  it("leaves package timeblocks out of the totals in ignore mode", () => {
    const estimate = computeFoodPackageEstimate({ ...base, packageTimeblockIds, mode: "ignore", guests: null })
    // menu 50000, food 15000, beverage 14000 -> charges 79000; gratuity round(29000 × 0.18) = 5220;
    // HST round(79000 × 0.13) = 10270; charges total 89270; grand 94490
    expect(estimate.low).toEqual({
      menuSubtotalCents: 50000,
      foodSubtotalCents: 15000,
      beverageSubtotalCents: 14000,
      chargesSubtotalCents: 79000,
      gratuityBaseCents: 29000,
      gratuityCents: 5220,
      hstCents: 10270,
      chargesTotalCents: 89270,
      grandTotalCents: 94490,
      paidTotalCents: 0,
      balanceDueCents: 94490,
    })
    expect(estimate.high).toEqual(estimate.low)
  })

  it("adds the average package subtotal as food in average mode", () => {
    const estimate = computeFoodPackageEstimate({ ...base, packageTimeblockIds, mode: "average", guests: null })
    // (240000 + 100000 + 160000) / 3 = 166666.67 -> 166667
    expect(estimate.averageSubtotalCents).toEqual({ low: 166667, high: 166667 })
    // food 15000 + 166667 = 181667; charges 50000 + 181667 + 14000 = 245667; gratuity base 195667;
    // gratuity round(35220.06) = 35220; HST round(31936.71) = 31937; charges total 277604;
    // grand 312824
    expect(estimate.low).toEqual({
      menuSubtotalCents: 50000,
      foodSubtotalCents: 181667,
      beverageSubtotalCents: 14000,
      chargesSubtotalCents: 245667,
      gratuityBaseCents: 195667,
      gratuityCents: 35220,
      hstCents: 31937,
      chargesTotalCents: 277604,
      grandTotalCents: 312824,
      paidTotalCents: 0,
      balanceDueCents: 312824,
    })
    expect(estimate.high).toEqual(estimate.low)
  })

  it("ranges from the cheapest to the most expensive package in list mode", () => {
    const estimate = computeFoodPackageEstimate({ ...base, packageTimeblockIds, mode: "list", guests: null })
    // low with B (100000): food 115000; charges 179000; gratuity base 129000 -> 23220;
    // HST 23270; charges total 202270; grand 225490
    expect(estimate.low).toEqual({
      menuSubtotalCents: 50000,
      foodSubtotalCents: 115000,
      beverageSubtotalCents: 14000,
      chargesSubtotalCents: 179000,
      gratuityBaseCents: 129000,
      gratuityCents: 23220,
      hstCents: 23270,
      chargesTotalCents: 202270,
      grandTotalCents: 225490,
      paidTotalCents: 0,
      balanceDueCents: 225490,
    })
    // high with A (240000): food 255000; charges 319000; gratuity base 269000 -> 48420;
    // HST 41470; charges total 360470; grand 408890
    expect(estimate.high).toEqual({
      menuSubtotalCents: 50000,
      foodSubtotalCents: 255000,
      beverageSubtotalCents: 14000,
      chargesSubtotalCents: 319000,
      gratuityBaseCents: 269000,
      gratuityCents: 48420,
      hstCents: 41470,
      chargesTotalCents: 360470,
      grandTotalCents: 408890,
      paidTotalCents: 0,
      balanceDueCents: 408890,
    })
  })

  it("returns packages in timeblock order with per-person pricing when guests are given", () => {
    const estimate = computeFoodPackageEstimate({
      ...base,
      packageTimeblockIds,
      mode: "list",
      guests: { min: 80, max: 100 },
    })

    expect(estimate.mode).toBe("list")
    expect(estimate.packages.map((pkg) => pkg.timeblockId)).toEqual(["pkg-a", "pkg-b", "pkg-c"])
    expect(estimate.packages.map((pkg) => pkg.totals.low.subtotalCents)).toEqual([240000, 100000, 160000])
    // A: 2400 + 312 + 432 = 3144 at 100; 3000 + 390 + 540 = 3930 at 80
    expect(estimate.packages[0]?.perPerson?.atMaxGuests.totalCents).toBe(3144)
    expect(estimate.packages[0]?.perPerson?.atMinGuests.totalCents).toBe(3930)
    // B: 1000 + 130 + 180 = 1310 at 100; 1250 + round(162.5) = 163 + 225 = 1638 at 80
    expect(estimate.packages[1]?.perPerson?.atMaxGuests).toEqual({
      subtotalCents: 1000,
      hstCents: 130,
      gratuityCents: 180,
      totalCents: 1310,
    })
    expect(estimate.packages[1]?.perPerson?.atMinGuests).toEqual({
      subtotalCents: 1250,
      hstCents: 163,
      gratuityCents: 225,
      totalCents: 1638,
    })
    // C: 1600 + 208 + 288 = 2096 at 100; 2000 + 260 + 360 = 2620 at 80
    expect(estimate.packages[2]?.perPerson?.atMaxGuests.totalCents).toBe(2096)
    expect(estimate.packages[2]?.perPerson?.atMinGuests.totalCents).toBe(2620)
  })
})

describe("formatCurrencyRange", () => {
  it("shows one amount when the ends match and orders a range low to high", () => {
    expect(formatCurrencyRange(1000, 1000)).toBe("$10.00")
    expect(formatCurrencyRange(2500, 1000)).toBe("$10.00 – $25.00")
  })
})

describe("buildFoodPackageEstimateRows", () => {
  const estimateFor = (mode: "ignore" | "average" | "list", ids: string[] | null = ["pkg-a", "pkg-b"]) =>
    computeFoodPackageEstimate({
      menuItems: [],
      foodTimeblocks,
      beverageItems: [],
      packageTimeblockIds: ids,
      mode,
      guests: null,
    })

  it("adds no rows without packages", () => {
    expect(buildFoodPackageEstimateRows(estimateFor("list", null))).toEqual([])
  })

  it("points to the packages page, unpriced, in ignore mode", () => {
    expect(buildFoodPackageEstimateRows(estimateFor("ignore"))).toEqual([
      {
        key: "food-packages-pointer",
        name: "Food packages (2): priced separately, see Food Packages",
        lowCents: 0,
        highCents: 0,
      },
    ])
  })

  it("adds one average row in average mode", () => {
    // (240000 + 100000) / 2
    expect(buildFoodPackageEstimateRows(estimateFor("average"))).toEqual([
      { key: "food-packages-average", name: "Food package (average of 2)", lowCents: 170000, highCents: 170000 },
    ])
  })

  it("adds one row per package in list mode", () => {
    expect(buildFoodPackageEstimateRows(estimateFor("list"))).toEqual([
      { key: "food-package-pkg-a", name: "Food package option: Package A", lowCents: 240000, highCents: 240000 },
      { key: "food-package-pkg-b", name: "Food package option: Package B", lowCents: 100000, highCents: 100000 },
    ])
  })
})

describe("formatGuestCountRange", () => {
  it("prints one count or a range", () => {
    expect(formatGuestCountRange({ min: 80, max: 80 })).toBe("80 guests")
    expect(formatGuestCountRange({ min: 80, max: 120 })).toBe("80–120 guests")
  })
})

describe("per-person pricing", () => {
  // Buffet: 4500 per person (its quantity is ignored); Cake: 1 × 20000 each
  const buffetPackage = makeTimeblock("pkg-pp", "Buffet", [
    { id: "pp1", name: "Buffet", quantity: 3, unitPriceCents: 4500, pricingBasis: "per_person" },
    { id: "pp2", name: "Cake", quantity: 1, unitPriceCents: 20000, pricingBasis: "each" },
    { id: "pp3", name: "Coffee", quantity: null, unitPriceCents: 300, pricingBasis: "per_person" },
    { id: "pp4", name: "Tea", quantity: 5, unitPriceCents: null, pricingBasis: "per_person" },
  ])

  it("splits a package into each items and a per-guest rate, with totals across the guest range", () => {
    const summary = summarizeFoodPackage(buffetPackage, { min: 80, max: 120 })
    expect(summary.eachSubtotalCents).toBe(20000)
    expect(summary.perPersonRateCents).toBe(4800)
    // 20000 + 4800 × 80 = 404000; × 120 = 596000
    expect(summary.totals.low.subtotalCents).toBe(404000)
    expect(summary.totals.high.subtotalCents).toBe(596000)
    // 404000 / 80 = 5050; 596000 / 120 = 4966.67
    expect(summary.perPerson?.atMinGuests.subtotalCents).toBe(5050)
    expect(summary.perPerson?.atMaxGuests.subtotalCents).toBe(4967)
    // A per-person item needs only a price
    expect(summary.unpricedItemNames).toEqual(["Tea"])
  })

  it("leaves per-person items out of a package's total without a guest count", () => {
    const summary = summarizeFoodPackage(buffetPackage, null)
    expect(summary.totals.low.subtotalCents).toBe(20000)
    expect(summary.totals.high.subtotalCents).toBe(20000)
    expect(summary.perPerson).toBeNull()
    expect(computeFoodPackageSubtotalCents(summary, null)).toBe(20000)
    expect(computeFoodPackageSubtotalCents(summary, 10)).toBe(68000)
  })

  // Certain food: Coffee 300 per person; bar 2000 per person; venue 50000
  const coffee = makeTimeblock("coffee", "Coffee", [
    { id: "c1", name: "Coffee", quantity: 1, unitPriceCents: 300, pricingBasis: "per_person" },
  ])
  // Each-only package: 50000. Per-person package: 4000 per guest.
  const eachPackage = makeTimeblock("pkg-each", "Plated", [{ id: "e1", quantity: 1, unitPriceCents: 50000 }])
  const perPersonPackage = makeTimeblock("pkg-pp", "Buffet", [
    { id: "p1", quantity: null, unitPriceCents: 4000, pricingBasis: "per_person" },
  ])
  const ppBase = {
    menuItems,
    foodTimeblocks: [coffee, eachPackage, perPersonPackage],
    beverageItems: [makeBeverageItem("bar", 0, 2000, "per_person")],
  }
  const ids = ["pkg-each", "pkg-pp"]

  it("ranges the ordinary estimate over the guest count", () => {
    const estimate = computeFoodPackageEstimate({
      ...ppBase,
      packageTimeblockIds: ids,
      mode: "ignore",
      guests: { min: 10, max: 20 },
    })
    expect(estimate.low.foodSubtotalCents).toBe(3000)
    expect(estimate.high.foodSubtotalCents).toBe(6000)
    expect(estimate.low.beverageSubtotalCents).toBe(20000)
    expect(estimate.high.beverageSubtotalCents).toBe(40000)
    expect(estimate.rangeNote).toBe("by guest count")
    expect({ low: estimate.low, high: estimate.high }).toEqual(
      computeEstimateSummaryRange({
        menuItems,
        foodTimeblocks: [coffee],
        beverageItems: ppBase.beverageItems,
        guests: { min: 10, max: 20 },
      }),
    )
  })

  it("takes the cheapest package at the fewest guests and the dearest at the most in list mode", () => {
    const estimate = computeFoodPackageEstimate({
      ...ppBase,
      packageTimeblockIds: ids,
      mode: "list",
      guests: { min: 10, max: 20 },
    })
    // At 10: Plated 50000, Buffet 40000 -> 40000. At 20: Plated 50000, Buffet 80000 -> 80000.
    expect(estimate.low.foodSubtotalCents).toBe(3000 + 40000)
    expect(estimate.high.foodSubtotalCents).toBe(6000 + 80000)
    expect(estimate.rangeNote).toBe("by package and guest count")
    expect(buildFoodPackageEstimateRows(estimate)).toEqual([
      { key: "food-package-pkg-each", name: "Food package option: Plated", lowCents: 50000, highCents: 50000 },
      { key: "food-package-pkg-pp", name: "Food package option: Buffet", lowCents: 40000, highCents: 80000 },
    ])
  })

  it("averages packages at each end of the guest range in average mode", () => {
    const estimate = computeFoodPackageEstimate({
      ...ppBase,
      packageTimeblockIds: ids,
      mode: "average",
      guests: { min: 10, max: 20 },
    })
    expect(estimate.averageSubtotalCents).toEqual({ low: 45000, high: 65000 })
    expect(estimate.low.foodSubtotalCents).toBe(3000 + 45000)
    expect(estimate.high.foodSubtotalCents).toBe(6000 + 65000)
    expect(buildFoodPackageEstimateRows(estimate)).toEqual([
      { key: "food-packages-average", name: "Food package (average of 2)", lowCents: 45000, highCents: 65000 },
    ])
  })

  it("names the package as the only reason for a range at a fixed guest count", () => {
    const estimate = computeFoodPackageEstimate({
      ...ppBase,
      packageTimeblockIds: ids,
      mode: "list",
      guests: { min: 15, max: 15 },
    })
    // At 15: Plated 50000, Buffet 60000
    expect(estimate.low.foodSubtotalCents).toBe(4500 + 50000)
    expect(estimate.high.foodSubtotalCents).toBe(4500 + 60000)
    expect(estimate.rangeNote).toBe("by package chosen")
  })

  it("leaves per-person lines out of every total without a guest count", () => {
    const estimate = computeFoodPackageEstimate({ ...ppBase, packageTimeblockIds: ids, mode: "list", guests: null })
    // Coffee and the bar drop out; Buffet is 0 without guests, Plated 50000
    expect(estimate.low.foodSubtotalCents).toBe(0)
    expect(estimate.high.foodSubtotalCents).toBe(50000)
    expect(estimate.low.beverageSubtotalCents).toBe(0)
    expect(estimate.rangeNote).toBe("by package chosen")
  })

  it("has no range note when the totals do not vary", () => {
    const estimate = computeFoodPackageEstimate({
      ...ppBase,
      packageTimeblockIds: ids,
      mode: "ignore",
      guests: { min: 12, max: 12 },
    })
    expect(estimate.low).toEqual(estimate.high)
    expect(estimate.rangeNote).toBeNull()
  })
})
