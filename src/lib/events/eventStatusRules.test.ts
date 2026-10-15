import { describe, expect, it } from "vitest"
import { EVENT_STATUSES } from "~/definitions/enums"
import {
  assertStatusAllowedForDate,
  EVENT_STATUS_REQUIRES_DATE_ERROR,
  isDateRemovalBlockedByStatus,
  isStatusAllowedForDate,
  statusRequiresDate,
} from "./eventStatusRules"

const DATE = "2026-07-14T15:00:00.000Z"

describe("statusRequiresDate", () => {
  it("lets only New Lead and Lost go without a date", () => {
    expect(EVENT_STATUSES.filter((status) => !statusRequiresDate(status))).toEqual([
      "new_lead",
      "lost",
    ])
  })
})

describe("isStatusAllowedForDate", () => {
  it("allows every status once the event has a date", () => {
    for (const status of EVENT_STATUSES) {
      expect(isStatusAllowedForDate(status, DATE)).toBe(true)
    }
  })

  it("allows New Lead and Lost without a date", () => {
    expect(isStatusAllowedForDate("new_lead", null)).toBe(true)
    expect(isStatusAllowedForDate("lost", undefined)).toBe(true)
  })

  it("rejects Tentative, Confirmed and Complete without a date", () => {
    expect(isStatusAllowedForDate("tentative", null)).toBe(false)
    expect(isStatusAllowedForDate("confirmed", null)).toBe(false)
    expect(isStatusAllowedForDate("closed", "")).toBe(false)
  })
})

describe("assertStatusAllowedForDate", () => {
  it("throws the shared message when the status needs a date", () => {
    expect(() => assertStatusAllowedForDate("confirmed", null)).toThrow(
      EVENT_STATUS_REQUIRES_DATE_ERROR,
    )
  })

  it("does not throw when the pair is valid", () => {
    expect(() => assertStatusAllowedForDate("confirmed", DATE)).not.toThrow()
    expect(() => assertStatusAllowedForDate("new_lead", null)).not.toThrow()
  })
})

describe("isDateRemovalBlockedByStatus", () => {
  it("blocks clearing the date on a status that needs one", () => {
    expect(isDateRemovalBlockedByStatus("tentative", DATE, null)).toBe(true)
    expect(isDateRemovalBlockedByStatus("closed", DATE, null)).toBe(true)
  })

  it("allows clearing the date on New Lead and Lost", () => {
    expect(isDateRemovalBlockedByStatus("new_lead", DATE, null)).toBe(false)
    expect(isDateRemovalBlockedByStatus("lost", DATE, null)).toBe(false)
  })

  it("ignores saves that keep or change the date", () => {
    expect(isDateRemovalBlockedByStatus("confirmed", DATE, DATE)).toBe(false)
    expect(isDateRemovalBlockedByStatus("confirmed", null, null)).toBe(false)
    expect(isDateRemovalBlockedByStatus("confirmed", DATE, "2026-08-01T15:00:00.000Z")).toBe(false)
  })
})
