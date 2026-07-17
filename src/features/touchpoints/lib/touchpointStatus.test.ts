import { describe, expect, it } from "vitest"

import {
  daysFromToday,
  getTouchpointUrgency,
  getTouchpointUrgencyFromStored,
  parseStoredDueDate,
  startOfDay,
} from "./touchpointStatus"

function dateAt(year: number, monthIndex: number, day: number): Date {
  return new Date(year, monthIndex, day, 15, 30, 0)
}

describe("startOfDay", () => {
  it("strips time components", () => {
    const result = startOfDay(dateAt(2026, 6, 16))
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
    expect(result.getSeconds()).toBe(0)
    expect(result.getDate()).toBe(16)
  })
})

describe("daysFromToday", () => {
  const now = dateAt(2026, 6, 16)

  it("returns 0 for the same calendar day", () => {
    expect(daysFromToday(dateAt(2026, 6, 16), now)).toBe(0)
  })

  it("returns negative days for past dates", () => {
    expect(daysFromToday(dateAt(2026, 6, 13), now)).toBe(-3)
  })

  it("returns positive days for future dates", () => {
    expect(daysFromToday(dateAt(2026, 6, 20), now)).toBe(4)
  })
})

describe("getTouchpointUrgency", () => {
  const now = dateAt(2026, 6, 16)

  it("returns past due for dates before today", () => {
    expect(getTouchpointUrgency(dateAt(2026, 6, 15), now)).toBe("past due")
  })

  it("returns due today for today's date", () => {
    expect(getTouchpointUrgency(dateAt(2026, 6, 16), now)).toBe("due today")
  })

  it("returns upcoming for dates within 3 days", () => {
    expect(getTouchpointUrgency(dateAt(2026, 6, 17), now)).toBe("upcoming")
    expect(getTouchpointUrgency(dateAt(2026, 6, 19), now)).toBe("upcoming")
  })

  it("returns standard for dates more than 3 days away", () => {
    expect(getTouchpointUrgency(dateAt(2026, 6, 20), now)).toBe("standard")
  })
})

describe("parseStoredDueDate / getTouchpointUrgencyFromStored", () => {
  const now = dateAt(2026, 6, 16)

  it("maps UTC-midnight ISO to the matching local calendar day", () => {
    const parsed = parseStoredDueDate("2026-07-16T00:00:00.000Z")
    expect(parsed?.getFullYear()).toBe(2026)
    expect(parsed?.getMonth()).toBe(6)
    expect(parsed?.getDate()).toBe(16)
    expect(getTouchpointUrgencyFromStored("2026-07-16T00:00:00.000Z", now)).toBe("due today")
  })
})
