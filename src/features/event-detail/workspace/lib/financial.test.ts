import { describe, expect, it } from "vitest"

import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"

import {
  GRATUITY_RATE,
  HST_RATE,
  centsToDollars,
  computeBillableLineTotalCents,
  computeEstimateLineTotalCents,
  computeEstimateSummaryRange,
  computeFinancialSummaryAllSources,
  computeGrandTotalPerGuest,
  computePerGuestBreakdown,
  computeInvoiceFoodTimeblockSubtotalCents,
  dollarsToCents,
  fromDateInputValue,
  needsPackageQuantity,
  parseDollarsToCents,
  toCurrency,
  toDateInputValue,
} from "./financial"

describe("financial helpers", () => {
  it("converts dollars and cents correctly", () => {
    expect(dollarsToCents("12.34")).toBe(1234)
    expect(dollarsToCents(1.005)).toBe(100)
    expect(centsToDollars(250)).toBe(2.5)
  })

  it("computes line totals and summary totals", () => {
    const summary = computeFinancialSummaryAllSources({
      menuItems: [
        { id: "a", quantity: 2, unitPriceCents: 1500 } as never,
        { id: "b", quantity: 1, unitPriceCents: 5000 } as never,
      ],
      payments: [{ id: "p", amountCents: 1000 } as never],
      foodTimeblocks: [],
      beverageItems: [],
    })

    expect(computeBillableLineTotalCents({ quantity: 3, unitPriceCents: 250 })).toBe(750)
    expect(summary.menuSubtotalCents).toBe(8000)
    expect(summary.hstCents).toBe(Math.round(8000 * HST_RATE))
    expect(summary.chargesTotalCents).toBe(9040)
    expect(summary.paidTotalCents).toBe(1000)
    expect(summary.balanceDueCents).toBe(8040)
  })

  it("computes all-source totals including food and beverage", () => {
    const menuItems = [
      { id: "m1", quantity: 1, unitPriceCents: 1000 } as never,
      { id: "m2", quantity: 2, unitPriceCents: 500 } as never,
    ]
    const food = [
      { id: "f-tb", foodItems: [{ id: "f1", quantity: 2, unitPriceCents: 250 }] } as never,
    ]
    const beverage = [
      { id: "b1", quantity: 3, unitPriceCents: 100 } as never,
    ]
    const payments = [{ id: "p1", amountCents: 500 } as never]

    expect(computeBillableLineTotalCents({ quantity: 2, unitPriceCents: 250 })).toBe(500)

    const summary = computeFinancialSummaryAllSources({ menuItems, foodTimeblocks: food, beverageItems: beverage, payments })
    expect(summary.menuSubtotalCents).toBe(2000)
    expect(summary.foodSubtotalCents).toBe(500)
    expect(summary.beverageSubtotalCents).toBe(300)
    expect(summary.chargesSubtotalCents).toBe(2800)
    expect(summary.gratuityBaseCents).toBe(800)
    expect(summary.gratuityCents).toBe(Math.round(800 * GRATUITY_RATE))
    expect(summary.hstCents).toBe(Math.round(2800 * HST_RATE))
    expect(summary.chargesTotalCents).toBe(3164)
    expect(summary.grandTotalCents).toBe(3308)
    expect(summary.paidTotalCents).toBe(500)
    expect(summary.balanceDueCents).toBe(2808)
  })

  it("adds additionalFoodSubtotalCents to food, with gratuity and HST", () => {
    const params = {
      menuItems: [{ id: "m1", quantity: 1, unitPriceCents: 2000 } as never],
      foodTimeblocks: [{ id: "f-tb", foodItems: [{ id: "f1", quantity: 2, unitPriceCents: 250 }] } as never],
      beverageItems: [{ id: "b1", quantity: 3, unitPriceCents: 100 } as never],
      payments: [{ id: "p1", amountCents: 500 } as never],
    }

    // Omitting the param is the same as passing 0
    expect(computeFinancialSummaryAllSources(params)).toEqual(
      computeFinancialSummaryAllSources({ ...params, additionalFoodSubtotalCents: 0 }),
    )

    const summary = computeFinancialSummaryAllSources({ ...params, additionalFoodSubtotalCents: 1000 })
    // food 500 + 1000 = 1500; charges 2000 + 1500 + 300 = 3800; gratuity base 1800 -> 324;
    // HST round(494) = 494; charges total 4294; grand 4618; balance 4118
    expect(summary.foodSubtotalCents).toBe(1500)
    expect(summary.chargesSubtotalCents).toBe(3800)
    expect(summary.gratuityBaseCents).toBe(1800)
    expect(summary.gratuityCents).toBe(324)
    expect(summary.hstCents).toBe(494)
    expect(summary.chargesTotalCents).toBe(4294)
    expect(summary.grandTotalCents).toBe(4618)
    expect(summary.balanceDueCents).toBe(4118)
  })

  it("does not apply gratuity to menu-only totals", () => {
    const summary = computeFinancialSummaryAllSources({
      menuItems: [{ id: "m1", quantity: 1, unitPriceCents: 1000 } as never],
      foodTimeblocks: [],
      beverageItems: [],
      payments: [],
    })

    expect(summary.gratuityBaseCents).toBe(0)
    expect(summary.gratuityCents).toBe(0)
    expect(summary.hstCents).toBe(Math.round(1000 * HST_RATE))
    expect(summary.grandTotalCents).toBe(1130)
  })

  it("counts beverage items once even when assigned to multiple timeblocks", () => {
    const beverageItems = [
      { id: "b1", quantity: 2, unitPriceCents: 500 } as never,
    ]
    const summary = computeFinancialSummaryAllSources({ menuItems: [], foodTimeblocks: [], beverageItems, payments: [] })
    expect(summary.beverageSubtotalCents).toBe(1000)
  })

  it("returns zero totals when source data is unavailable", () => {
    const summary = computeFinancialSummaryAllSources({
      menuItems: undefined,
      foodTimeblocks: undefined,
      beverageItems: undefined,
      payments: undefined,
    })

    expect(Object.values(summary)).toEqual(Array(11).fill(0))
  })

  it("handles missing quantities, prices, food items, and payment amounts", () => {
    const summary = computeFinancialSummaryAllSources({
      menuItems: [{ quantity: null, unitPriceCents: 100 } as never],
      foodTimeblocks: [
        { foodItems: undefined } as never,
        { foodItems: [{ quantity: 2, unitPriceCents: null }] } as never,
      ],
      beverageItems: [{ quantity: null, unitPriceCents: null } as never],
      payments: [{ amountCents: null } as never],
    })

    expect(summary.chargesSubtotalCents).toBe(0)
    expect(summary.gratuityCents).toBe(0)
    expect(summary.paidTotalCents).toBe(0)
    expect(summary.balanceDueCents).toBe(0)
  })

  it("maps date input values to ISO and back", () => {
    const iso = fromDateInputValue("2026-11-03")
    expect(iso).toBe("2026-11-03T00:00:00.000Z")
    expect(toDateInputValue(iso)).toBe("2026-11-03")
  })

  it("formats cents as Canadian dollars with a plain $ sign", () => {
    expect(toCurrency(123456789)).toBe("$1,234,567.89")
    expect(toCurrency(50)).toBe("$0.50")
    expect(toCurrency(-1250)).toBe("-$12.50")
  })
})

describe("per-person pricing on the estimate", () => {
  const params = {
    menuItems: [{ id: "m1", quantity: 1, unitPriceCents: 2000 } as never],
    foodTimeblocks: [
      {
        id: "f-tb",
        foodItems: [
          { id: "f1", quantity: 2, unitPriceCents: 250 },
          { id: "f2", quantity: 3, unitPriceCents: 4500, pricingBasis: "per_person" },
        ],
      } as never,
    ],
    beverageItems: [
      { id: "b1", quantity: 3, unitPriceCents: 100, pricingBasis: "each" } as never,
      { id: "b2", quantity: null, unitPriceCents: 1000, pricingBasis: "per_person" } as never,
    ],
  }

  it("prices each line by quantity × price when no guest count is passed (invoice)", () => {
    const summary = computeFinancialSummaryAllSources(params)
    // food 500 + 3 × 4500 = 14000; beverage 300 + 0 = 300
    expect(summary.foodSubtotalCents).toBe(14000)
    expect(summary.beverageSubtotalCents).toBe(300)
  })

  it("prices per-person lines by the guest count, ignoring quantity", () => {
    const summary = computeFinancialSummaryAllSources({ ...params, perPersonGuestCount: 50 })
    // food 500 + 4500 × 50 = 225500; beverage 300 + 1000 × 50 = 50300; menu unchanged
    expect(summary.menuSubtotalCents).toBe(2000)
    expect(summary.foodSubtotalCents).toBe(225500)
    expect(summary.beverageSubtotalCents).toBe(50300)
    expect(summary.gratuityBaseCents).toBe(275800)
  })

  it("leaves per-person lines out when the guest count is null", () => {
    const summary = computeFinancialSummaryAllSources({ ...params, perPersonGuestCount: null })
    expect(summary.foodSubtotalCents).toBe(500)
    expect(summary.beverageSubtotalCents).toBe(300)
  })

  it("computes one estimate line", () => {
    const perPerson = { quantity: 3, unitPriceCents: 4500, pricingBasis: "per_person" as const }
    expect(computeEstimateLineTotalCents(perPerson, 80)).toBe(360000)
    expect(computeEstimateLineTotalCents(perPerson, null)).toBeNull()
    expect(computeEstimateLineTotalCents({ quantity: 3, unitPriceCents: 4500 }, 80)).toBe(13500)
    expect(computeEstimateLineTotalCents({ quantity: 3, unitPriceCents: 4500, pricingBasis: "each" }, null)).toBe(13500)
  })

  it("ranges the estimate from the fewest to the most guests", () => {
    const range = computeEstimateSummaryRange({ ...params, guests: { min: 10, max: 20 } })
    expect(range.low).toEqual(computeFinancialSummaryAllSources({ ...params, perPersonGuestCount: 10 }))
    expect(range.high).toEqual(computeFinancialSummaryAllSources({ ...params, perPersonGuestCount: 20 }))
    expect(range.low.foodSubtotalCents).toBe(500 + 45000)
    expect(range.high.foodSubtotalCents).toBe(500 + 90000)

    const withExtra = computeEstimateSummaryRange({
      ...params,
      guests: { min: 10, max: 20 },
      additionalFoodSubtotalCents: { low: 100, high: 200 },
    })
    expect(withExtra.low.foodSubtotalCents).toBe(500 + 45000 + 100)
    expect(withExtra.high.foodSubtotalCents).toBe(500 + 90000 + 200)
  })

  it("leaves per-person lines out of both ends without a guest count", () => {
    const range = computeEstimateSummaryRange({ ...params, guests: null })
    expect(range.low).toEqual(range.high)
    expect(range.low).toEqual(computeFinancialSummaryAllSources({ ...params, perPersonGuestCount: null }))
    expect(range.low.paidTotalCents).toBe(0)
  })
})

describe("invoice package billing", () => {
  const timeblock = (overrides: Partial<TimeblockWithItems>): TimeblockWithItems => ({
    id: "dinner",
    eventId: "e1",
    title: "Dinner",
    time: null,
    details: null,
    sectionType: "food",
    assignedTo: null,
    createdAt: "0",
    updatedAt: null,
    foodItems: [
      { id: "steak", timeblockId: "dinner", name: "Steak", quantity: 40, unitPriceCents: 3000, pricingBasis: "per_person", serviceStyle: null, clientNotes: null, internalNotes: null },
      { id: "wings", timeblockId: "dinner", name: "Wings", quantity: 3, unitPriceCents: 10000, pricingBasis: "each", serviceStyle: null, clientNotes: null, internalNotes: null },
    ],
    ...overrides,
  })

  it("bills every item quantity × price without a package price", () => {
    expect(computeInvoiceFoodTimeblockSubtotalCents(timeblock({}))).toBe(40 * 3000 + 3 * 10000)
    expect(needsPackageQuantity(timeblock({}))).toBe(false)
  })

  it("bills the package price × the final quantity plus fixed-price items", () => {
    const priced = timeblock({ packagePricePerPersonCents: 4500, packageQuantity: 45 })
    expect(computeInvoiceFoodTimeblockSubtotalCents(priced)).toBe(4500 * 45 + 3 * 10000)
    expect(needsPackageQuantity(priced)).toBe(false)
  })

  it("bills only the fixed-price items and flags the package until its quantity is set", () => {
    const unset = timeblock({ packagePricePerPersonCents: 4500, packageQuantity: null })
    expect(computeInvoiceFoodTimeblockSubtotalCents(unset)).toBe(3 * 10000)
    expect(needsPackageQuantity(unset)).toBe(true)
  })

  it("treats a quantity of 0 as set", () => {
    const zero = timeblock({ packagePricePerPersonCents: 4500, packageQuantity: 0 })
    expect(computeInvoiceFoodTimeblockSubtotalCents(zero)).toBe(3 * 10000)
    expect(needsPackageQuantity(zero)).toBe(false)
  })
})

describe("parseDollarsToCents", () => {
  it("reads typed amounts, with or without $ and commas", () => {
    expect(parseDollarsToCents("45")).toBe(4500)
    expect(parseDollarsToCents("$45.50")).toBe(4550)
    expect(parseDollarsToCents(" $1,200 ")).toBe(120000)
    expect(parseDollarsToCents("0")).toBe(0)
  })

  it("is null for blank or unreadable text instead of $0", () => {
    expect(parseDollarsToCents("")).toBeNull()
    expect(parseDollarsToCents("forty")).toBeNull()
    expect(parseDollarsToCents("45/pp")).toBeNull()
  })
})

describe("computeGrandTotalPerGuest", () => {
  const range = (low: number, high: number) =>
    ({ low: { grandTotalCents: low }, high: { grandTotalCents: high } }) as Parameters<typeof computeGrandTotalPerGuest>[0]

  it("divides each end of the total by its own guest count", () => {
    // Fixed costs spread over fewer guests cost more per head
    expect(computeGrandTotalPerGuest(range(1_000_000, 1_100_000), { min: 100, max: 120 })).toEqual({
      lowCents: 10_000,
      highCents: 9_167,
    })
  })

  it("is null without a guest count", () => {
    expect(computeGrandTotalPerGuest(range(1000, 1000), null)).toBeNull()
    expect(computeGrandTotalPerGuest(range(1000, 1000), { min: 0, max: 0 })).toBeNull()
  })
})

describe("computePerGuestBreakdown", () => {
  it("divides before rounding, with HST on the subtotal and gratuity on food and beverage", () => {
    const summary = computeFinancialSummaryAllSources({
      menuItems: [{ id: "venue", quantity: 1, unitPriceCents: 150000 }] as never,
      foodTimeblocks: [],
      beverageItems: [],
      additionalFoodSubtotalCents: 38000,
    })
    // 188000 / 120 = 1566.67 -> 1567; HST 203.67 -> 204; gratuity 38000 / 120 × 0.18 = 57
    expect(computePerGuestBreakdown(summary, 120)).toEqual({
      subtotalCents: 1567,
      hstCents: 204,
      gratuityCents: 57,
      totalCents: 1828,
    })
  })
})
