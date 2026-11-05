import { describe, expect, it } from "vitest"

import {
  GRATUITY_RATE,
  HST_RATE,
  centsToDollars,
  computeBillableLineTotalCents,
  computeChargeLineTotalCents,
  computeFinancialSummaryAllSources,
  computeFinancialPreviewModel,
  dollarsToCents,
  fromDateInputValue,
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

    expect(computeChargeLineTotalCents({ quantity: 3, unitPriceCents: 250 } as never)).toBe(750)
    expect(summary.menuSubtotalCents).toBe(8000)
    expect(summary.hstCents).toBe(Math.round(8000 * HST_RATE))
    expect(summary.chargesTotalCents).toBe(9040)
    expect(summary.paidTotalCents).toBe(1000)
    expect(summary.balanceDueCents).toBe(8040)
  })

  it("computes preview model totals in cents", () => {
    const items = [
      { id: "venue-1", category: "Venue", quantity: 3, unitPriceCents: 1234 } as never,
      { id: "venue-2", category: "Venue", quantity: 1, unitPriceCents: 500 } as never,
      { id: "golf-1", category: "Golf", quantity: 2, unitPriceCents: 2000 } as never,
    ]

    const preview = computeFinancialPreviewModel({
      menuItems: items,
      foodTimeblocks: [],
      beverageItems: [],
      payments: [{ id: "p", amountCents: 1250 } as never],
    })
    expect(preview.menuSubtotalCents).toBe(8202)
    expect(preview.hstCents).toBe(Math.round(8202 * HST_RATE))
    expect(preview.chargesTotalCents).toBe(9268)
    expect(preview.paidTotalCents).toBe(1250)
    expect(preview.balanceDueCents).toBe(8018)
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
})
