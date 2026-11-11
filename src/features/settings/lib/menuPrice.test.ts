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

  it("never goes negative and treats junk as zero", () => {
    expect(parseMenuPrice("-3")).toBe(0)
    expect(parseMenuPrice("abc")).toBe(0)
  })
})

describe("formatMenuPrice", () => {
  it("shows two decimals, or nothing when there is no price", () => {
    expect(formatMenuPrice(750)).toBe("7.50")
    expect(formatMenuPrice(0)).toBe("0.00")
    expect(formatMenuPrice(null)).toBe("")
  })
})
