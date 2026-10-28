import { describe, expect, it } from "vitest"

import { formatTouchpointsPlainText } from "./formatTouchpointsPlainText"

describe("formatTouchpointsPlainText", () => {
  it("returns empty string for no items", () => {
    expect(formatTouchpointsPlainText([])).toBe("")
  })

  it("formats a TOUCHPOINTS block with title and date, whatever the machine's locale", () => {
    const dueDateIso = "2026-07-20T00:00:00.000Z"

    const text = formatTouchpointsPlainText([
      { title: "Final guest count", dueDate: dueDateIso },
      { title: "  ", dueDate: null },
    ])

    expect(text).toContain("TOUCHPOINTS")
    expect(text).toContain("- Final guest count — Jul 20, 2026")
    expect(text).toContain("- Untitled touchpoint")
  })

  it("orders items by due date, with undated last", () => {
    const later = "2026-07-25T00:00:00.000Z"
    const earlier = "2026-07-18T00:00:00.000Z"

    const text = formatTouchpointsPlainText([
      { title: "Later task", dueDate: later },
      { title: "No date", dueDate: null },
      { title: "Earlier task", dueDate: earlier },
    ])

    const earlierIndex = text.indexOf("- Earlier task — Jul 18, 2026")
    const laterIndex = text.indexOf("- Later task — Jul 25, 2026")
    const undatedIndex = text.indexOf("- No date")

    expect(earlierIndex).toBeGreaterThan(-1)
    expect(laterIndex).toBeGreaterThan(earlierIndex)
    expect(undatedIndex).toBeGreaterThan(laterIndex)
  })
})
