import { describe, expect, it } from "vitest"
import { getSafeBreakOffsets } from "./measureBlockBreaks"

describe("getSafeBreakOffsets", () => {
  it("finds space between lines without splitting overlapping columns", () => {
    expect(getSafeBreakOffsets([
      { top: 40, bottom: 60 },
      { top: 10, bottom: 25 },
      { top: 20, bottom: 35 },
    ], 80)).toEqual([37.5, 70])
  })

  it("keeps a table row intact despite gaps between its text lines", () => {
    expect(getSafeBreakOffsets([
      { top: 0, bottom: 70 },
      { top: 5, bottom: 20 },
      { top: 35, bottom: 50 },
      { top: 80, bottom: 100 },
    ], 120)).toEqual([75, 110])
  })

  it("handles empty content and ignores empty rectangles", () => {
    expect(getSafeBreakOffsets([], 100)).toEqual([])
    expect(getSafeBreakOffsets([{ top: 0, bottom: 0 }], 100)).toEqual([])
  })

  it("allows a break between touching table rows", () => {
    expect(getSafeBreakOffsets([
      { top: 0, bottom: 30 }, { top: 30, bottom: 60 }, { top: 60, bottom: 90 },
    ], 90)).toEqual([30, 60])
  })
})
