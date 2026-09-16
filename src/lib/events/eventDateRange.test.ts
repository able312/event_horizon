import { describe, expect, it } from "vitest"
import {
  assertValidEventDateRange,
  EVENT_DATE_RANGE_ERROR,
  isValidEventDateRange,
  resolveEndDateTimeForStart,
} from "./eventDateRange"

describe("isValidEventDateRange", () => {
  it("allows either side to be null", () => {
    expect(isValidEventDateRange(null, null)).toBe(true)
    expect(isValidEventDateRange("2026-07-14T15:00:00.000Z", null)).toBe(true)
    expect(isValidEventDateRange(null, "2026-07-14T15:00:00.000Z")).toBe(true)
  })

  it("allows equal timestamps", () => {
    const iso = "2026-07-14T15:00:00.000Z"
    expect(isValidEventDateRange(iso, iso)).toBe(true)
  })

  it("allows end after start", () => {
    expect(
      isValidEventDateRange("2026-07-14T15:00:00.000Z", "2026-07-14T16:00:00.000Z"),
    ).toBe(true)
  })

  it("rejects end before start including same-day earlier time", () => {
    expect(
      isValidEventDateRange("2026-07-14T16:00:00.000Z", "2026-07-14T15:00:00.000Z"),
    ).toBe(false)
    expect(
      isValidEventDateRange("2026-07-15T12:00:00.000Z", "2026-07-14T12:00:00.000Z"),
    ).toBe(false)
  })
})

describe("assertValidEventDateRange", () => {
  it("throws the shared error message when invalid", () => {
    expect(() =>
      assertValidEventDateRange(
        "2026-07-14T16:00:00.000Z",
        "2026-07-14T15:00:00.000Z",
      ),
    ).toThrow(EVENT_DATE_RANGE_ERROR)
  })

  it("does not throw when valid", () => {
    expect(() =>
      assertValidEventDateRange("2026-07-14T15:00:00.000Z", "2026-07-14T16:00:00.000Z"),
    ).not.toThrow()
  })
})

describe("resolveEndDateTimeForStart", () => {
  it("sets end to start when end is null and start is set", () => {
    const start = "2026-07-14T15:30:00.000Z"
    expect(resolveEndDateTimeForStart(null, start, null)).toBe(start)
  })

  it("leaves end alone when clearing start", () => {
    const end = "2026-07-14T18:00:00.000Z"
    expect(resolveEndDateTimeForStart("2026-07-14T15:00:00.000Z", null, end)).toBe(end)
  })

  it("leaves end alone when it is still after the new start", () => {
    const start = "2026-07-14T10:00:00.000Z"
    const end = "2026-07-14T18:00:00.000Z"
    expect(resolveEndDateTimeForStart(null, start, end)).toBe(end)
  })

  it("shifts end to the new start day keeping time-of-day when end would be before start", () => {
    // Local interpretation: start moves past end's calendar day
    const prevStart = "2026-07-14T10:00:00.000Z"
    const newStartLocal = new Date(2026, 6, 16, 10, 0, 0)
    const currentEndLocal = new Date(2026, 6, 14, 18, 30, 0)

    const result = resolveEndDateTimeForStart(
      prevStart,
      newStartLocal.toISOString(),
      currentEndLocal.toISOString(),
    )

    const resultDate = new Date(result!)
    expect(resultDate.getFullYear()).toBe(2026)
    expect(resultDate.getMonth()).toBe(6)
    expect(resultDate.getDate()).toBe(16)
    expect(resultDate.getHours()).toBe(18)
    expect(resultDate.getMinutes()).toBe(30)
  })

  it("sets end equal to start when shifted time-of-day is still before start", () => {
    const newStartLocal = new Date(2026, 6, 16, 20, 0, 0)
    const currentEndLocal = new Date(2026, 6, 14, 9, 0, 0)

    const result = resolveEndDateTimeForStart(
      null,
      newStartLocal.toISOString(),
      currentEndLocal.toISOString(),
    )

    expect(result).toBe(newStartLocal.toISOString())
  })
})
