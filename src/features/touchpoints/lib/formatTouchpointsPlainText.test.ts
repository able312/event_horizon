import { describe, expect, it } from "vitest"

import { formatTouchpointsPlainText } from "./formatTouchpointsPlainText"

describe("formatTouchpointsPlainText", () => {
  it("returns empty string for no items", () => {
    expect(formatTouchpointsPlainText([])).toBe("")
  })

  it("formats a TOUCHPOINTS block with title and date", () => {
    const text = formatTouchpointsPlainText([
      { title: "Final guest count", dueDate: "2026-07-20T00:00:00.000Z" },
      { title: "  ", dueDate: null },
    ])

    expect(text).toContain("TOUCHPOINTS")
    expect(text).toContain("- Final guest count —")
    expect(text).toContain("- Untitled touchpoint")
  })
})
