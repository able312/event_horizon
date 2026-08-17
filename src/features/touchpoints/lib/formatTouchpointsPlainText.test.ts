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

  it("orders items by due date, with undated last", () => {
    const later = "2026-07-25T00:00:00.000Z"
    const earlier = "2026-07-18T00:00:00.000Z"
    const laterLabel = parseStoredDueDate(later)?.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    const earlierLabel = parseStoredDueDate(earlier)?.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })

    const text = formatTouchpointsPlainText([
      { title: "Later task", dueDate: later },
      { title: "No date", dueDate: null },
      { title: "Earlier task", dueDate: earlier },
    ])

    const earlierIndex = text.indexOf(`- Earlier task — ${earlierLabel}`)
    const laterIndex = text.indexOf(`- Later task — ${laterLabel}`)
    const undatedIndex = text.indexOf("- No date")

    expect(earlierIndex).toBeGreaterThan(-1)
    expect(laterIndex).toBeGreaterThan(earlierIndex)
    expect(undatedIndex).toBeGreaterThan(laterIndex)
  })
})
