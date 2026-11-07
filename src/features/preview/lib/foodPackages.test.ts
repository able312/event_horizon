import { describe, expect, it } from "vitest"

import type { BeverageItem, FoodItem, MenuOfChargeItem } from "~/definitions/database"
import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import { computeFinancialSummaryAllSources } from "~/features/event-detail/workspace/lib/financial"

import {
  buildFoodPackageEstimateRows,
  computeFoodChargeBreakdown,
  formatCurrencyRange,
  computeFoodPackageEstimate,
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

function makeBeverageItem(id: string, quantity: number, unitPriceCents: number): BeverageItem {
  return {
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
    expect(summary.totals).toEqual({ subtotalCents: 240000, hstCents: 31200, gratuityCents: 43200, totalCents: 314400 })
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
    expect(estimate.averageSubtotalCents).toBe(166667)
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
    expect(estimate.packages.map((pkg) => pkg.totals.subtotalCents)).toEqual([240000, 100000, 160000])
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
      { key: "food-packages-pointer", name: "Food packages (2): priced separately, see Food Packages", totalCents: 0 },
    ])
  })

  it("adds one average row in average mode", () => {
    // (240000 + 100000) / 2
    expect(buildFoodPackageEstimateRows(estimateFor("average"))).toEqual([
      { key: "food-packages-average", name: "Food package (average of 2)", totalCents: 170000 },
    ])
  })

  it("adds one row per package in list mode", () => {
    expect(buildFoodPackageEstimateRows(estimateFor("list"))).toEqual([
      { key: "food-package-pkg-a", name: "Food package option: Package A", totalCents: 240000 },
      { key: "food-package-pkg-b", name: "Food package option: Package B", totalCents: 100000 },
    ])
  })
})
