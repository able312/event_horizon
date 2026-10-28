import { describe, expect, it } from "vitest"
import { EVENT_STATUSES } from "~/definitions/enums"
import {
  assertStatusAllowedForDate,
  EVENT_STATUS_REQUIRES_DATE_ERROR,
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
