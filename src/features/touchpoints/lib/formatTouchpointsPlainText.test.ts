import { describe, expect, it } from "vitest"

import { formatTouchpointsPlainText } from "./formatTouchpointsPlainText"
import { parseStoredDueDate } from "./touchpointStatus"

describe("formatTouchpointsPlainText", () => {
  it("returns empty string for no items", () => {
    expect(formatTouchpointsPlainText([])).toBe("")
  })

  it("formats a TOUCHPOINTS block with title and date", () => {
    const dueDateIso = "2026-07-20T00:00:00.000Z"
    const expectedDate = parseStoredDueDate(dueDateIso)?.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })

    const text = formatTouchpointsPlainText([
      { title: "Final guest count", dueDate: dueDateIso },
      { title: "  ", dueDate: null },
    ])

    expect(text).toContain("TOUCHPOINTS")
    expect(text).toContain(`- Final guest count — ${expectedDate}`)
    expect(text).toContain("- Untitled touchpoint")
  })
})
