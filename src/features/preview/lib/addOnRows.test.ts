import { describe, expect, it } from "vitest"

import { formatAddOnCells } from "./addOnRows"

const addOn = (fixedCents: number, perPersonRateCents: number) => ({
  key: "a",
  name: "Add-on",
  includes: [],
  fixedCents,
  perPersonRateCents,
})

describe("formatAddOnCells", () => {
  it("prices a per-person add-on across the guest range", () => {
    expect(formatAddOnCells(addOn(0, 800), { min: 80, max: 120 }))
      .toEqual({ price: "$8.00 per person", total: "$640.00 – $960.00", perPerson: "$8.00" })
  })

  it("prices a fixed add-on the same whatever the guest count", () => {
    expect(formatAddOnCells(addOn(20000, 0), { min: 80, max: 120 }))
      .toEqual({ price: "$200.00", total: "$200.00", perPerson: "$1.67 – $2.50" })
    expect(formatAddOnCells(addOn(20000, 0), null)).toEqual({ price: "$200.00", total: "$200.00", perPerson: "" })
  })

  it("shows both parts of a mixed add-on", () => {
    expect(formatAddOnCells(addOn(10000, 900), { min: 50, max: 50 }))
      .toEqual({ price: "$9.00 per person + $100.00", total: "$550.00", perPerson: "$11.00" })
  })

  it("has no total for a per-person add-on without a guest count, and nothing when unpriced", () => {
    expect(formatAddOnCells(addOn(0, 800), null)).toEqual({ price: "$8.00 per person", total: "per person", perPerson: "" })
    expect(formatAddOnCells(addOn(0, 0), null)).toEqual({ price: "", total: "", perPerson: "" })
  })
})
