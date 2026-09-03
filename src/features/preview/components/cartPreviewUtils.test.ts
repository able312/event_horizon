import { describe, expect, it } from "vitest"

import {
  CART_KEYS_WARNING,
  countRequiredCarts,
  resolveCartGrid,
  STANDARD_CART_TEMPLATE,
} from "./cartPreviewUtils"

describe("cartPreviewUtils", () => {
  it("falls back to the shared standard template", () => {
    expect(resolveCartGrid(null)).toEqual(STANDARD_CART_TEMPLATE)
    expect(resolveCartGrid([])).toEqual(STANDARD_CART_TEMPLATE)
  })

  it("counts lead carts toward the required total", () => {
    const grid = [
      [1, 2, null, 3, null, 4],
      ["Lead", null, "Lead", null, null, null],
    ]
    expect(countRequiredCarts(grid)).toBe(6)
  })

  it("exposes the shared keys warning copy", () => {
    expect(CART_KEYS_WARNING).toContain("DO NOT leave keys")
  })
})
