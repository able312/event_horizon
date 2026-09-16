import { describe, expect, it } from "vitest"
import {
  combineDateWithTime,
  extractTimeString,
  replaceDatePreservingTime,
} from "./dateTimeInput.lib"

describe("extractTimeString", () => {
  it("returns empty string for null", () => {
    expect(extractTimeString(null)).toBe("")
  })

  it("returns HH:mm for a valid ISO string", () => {
    const local = new Date(2026, 6, 14, 15, 30, 0)
    expect(extractTimeString(local.toISOString())).toBe("15:30")
  })

  it("returns empty string for invalid ISO", () => {
    expect(extractTimeString("not-a-date")).toBe("")
  })
})

describe("combineDateWithTime", () => {
  it("uses midnight when time is null or empty", () => {
    const date = new Date(2026, 6, 14, 12, 0, 0)
    const result = new Date(combineDateWithTime(date, null))
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
    expect(result.getDate()).toBe(14)

    const empty = new Date(combineDateWithTime(date, ""))
    expect(empty.getHours()).toBe(0)
    expect(empty.getMinutes()).toBe(0)
  })

  it("applies a valid HH:mm time", () => {
    const date = new Date(2026, 6, 14)
    const result = new Date(combineDateWithTime(date, "09:45"))
    expect(result.getHours()).toBe(9)
    expect(result.getMinutes()).toBe(45)
  })

  it("falls back to midnight for invalid time strings without throwing", () => {
    const date = new Date(2026, 6, 14, 12, 0, 0)
    expect(() => combineDateWithTime(date, "not-a-time")).not.toThrow()
    const result = new Date(combineDateWithTime(date, "99:99"))
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
  })
})

describe("replaceDatePreservingTime", () => {
  it("uses midnight when there is no existing value", () => {
    const date = new Date(2026, 6, 20, 12, 0, 0)
    const result = new Date(replaceDatePreservingTime(null, date))
    expect(result.getDate()).toBe(20)
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
  })

  it("preserves time when replacing the calendar day", () => {
    const existing = new Date(2026, 6, 14, 15, 30, 0).toISOString()
    const newDay = new Date(2026, 6, 20)
    const result = new Date(replaceDatePreservingTime(existing, newDay))
    expect(result.getDate()).toBe(20)
    expect(result.getHours()).toBe(15)
    expect(result.getMinutes()).toBe(30)
  })
})
