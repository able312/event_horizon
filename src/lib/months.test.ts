import { describe, expect, it } from "vitest"

import {
  DROPDOWN_CALENDAR_YEARS_BACK,
  DROPDOWN_CALENDAR_YEARS_FORWARD,
  getDropdownMonthNavigationRange,
} from "~/lib/months"

describe("getDropdownMonthNavigationRange", () => {
  it("derives the range from the supplied current date", () => {
    const now = new Date(2026, 8, 16)
    const { startMonth, endMonth } = getDropdownMonthNavigationRange(now)

    expect(startMonth).toEqual(new Date(2026 - DROPDOWN_CALENDAR_YEARS_BACK, 0, 1))
    expect(endMonth).toEqual(new Date(2026 + DROPDOWN_CALENDAR_YEARS_FORWARD, 11, 1))
  })

  it("moves with the calendar year rather than being hardcoded", () => {
    const thisYear = getDropdownMonthNavigationRange(new Date(2026, 0, 1))
    const nextYear = getDropdownMonthNavigationRange(new Date(2027, 0, 1))

    expect(nextYear.startMonth.getFullYear()).toBe(thisYear.startMonth.getFullYear() + 1)
    expect(nextYear.endMonth.getFullYear()).toBe(thisYear.endMonth.getFullYear() + 1)
  })

  it("always allows selecting dates in future years", () => {
    const now = new Date(2026, 11, 31)
    const { endMonth } = getDropdownMonthNavigationRange(now)

    expect(endMonth.getFullYear()).toBeGreaterThan(now.getFullYear())
    expect(endMonth.getMonth()).toBe(11)
  })

  it("honours custom back/forward spans", () => {
    const now = new Date(2026, 5, 1)
    const { startMonth, endMonth } = getDropdownMonthNavigationRange(now, 1, 2)

    expect(startMonth.getFullYear()).toBe(2025)
    expect(endMonth.getFullYear()).toBe(2028)
  })
})
