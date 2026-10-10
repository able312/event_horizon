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

  it("uses the requested calendar zone independently of the server's zone", () => {
    const date = new Date("2026-10-25T02:00:00.000Z")
    expect(toIsoDateOnly(date, "America/Toronto")).toBe("2026-10-24T00:00:00.000Z")
    expect(toIsoDateOnly(date, "UTC")).toBe("2026-10-25T00:00:00.000Z")
    expect(toIsoDateOnly(date, "Asia/Tokyo")).toBe("2026-10-25T00:00:00.000Z")
  })

  it("rejects invalid dates and time zones", () => {
    expect(() => toIsoDateOnly(new Date("invalid"), "UTC")).toThrow()
    expect(() => toIsoDateOnly(new Date(), "invalid-zone")).toThrow()
  })
})
