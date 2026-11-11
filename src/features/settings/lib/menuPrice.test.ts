import { describe, expect, it } from "vitest"

import { formatMenuPrice, parseMenuPrice } from "./menuPrice"

describe("parseMenuPrice", () => {
  it("reads dollars as cents, with or without a dollar sign", () => {
    expect(parseMenuPrice("7.5")).toBe(750)
    expect(parseMenuPrice(" $12 ")).toBe(1200)
  })

  it("treats a blank field as no price", () => {
    expect(parseMenuPrice("  ")).toBeNull()
  })

  it("accepts thousands separators", () => {
    expect(parseMenuPrice("1,200.50")).toBe(120050)
    expect(parseMenuPrice("$1,200.50")).toBe(120050)
  })

  it("never goes negative", () => {
    expect(parseMenuPrice("-3")).toBe(0)
  })

  it("reports unreadable text as undefined instead of zero", () => {
    expect(parseMenuPrice("abc")).toBeUndefined()
    expect(parseMenuPrice("12..5")).toBeUndefined()
  })
})

describe("formatMenuPrice", () => {
  it("shows two decimals, or nothing when there is no price", () => {
    expect(formatMenuPrice(750)).toBe("7.50")
    expect(formatMenuPrice(0)).toBe("0.00")
    expect(formatMenuPrice(null)).toBe("")
  })
})
