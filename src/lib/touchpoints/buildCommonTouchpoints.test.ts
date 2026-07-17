import { describe, expect, it } from "vitest"

import { buildCommonTouchpoints, toIsoDateOnly } from "./buildCommonTouchpoints"

describe("buildCommonTouchpoints", () => {
  it("builds three relative touchpoints from event start", () => {
    const start = new Date(2026, 6, 25)
    const templates = buildCommonTouchpoints(start)

    expect(templates).toHaveLength(3)
    expect(templates[0]?.title).toBe("Confirm booking")
    expect(templates[1]?.title).toContain("menu")
    expect(templates[2]?.title).toBe("Final guest count")
    expect(templates[0]?.dueDate.getDate()).toBe(7)
    expect(templates[2]?.dueDate.getDate()).toBe(18)
  })
})

describe("toIsoDateOnly", () => {
  it("formats local date as UTC midnight ISO", () => {
    expect(toIsoDateOnly(new Date(2026, 6, 20))).toBe("2026-07-20T00:00:00.000Z")
  })
})
