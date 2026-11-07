import { describe, expect, it } from "vitest"

import { computeEstimateLineTotal, sumEstimateLineTotals } from "./estimateLineTotals"

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
