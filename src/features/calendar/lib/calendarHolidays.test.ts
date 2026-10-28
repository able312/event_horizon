import { afterEach, describe, expect, it, vi } from "vitest"

import type { HolidayEntry, HolidayMonth } from "~/definitions/holidays"
import { getHolidayNotice, getHolidayTitlesByDay } from "./calendarHolidays"

const holiday = (title: string, startDate: string, endDate: string): HolidayEntry => ({ id: title, title, startDate, endDate })
const month = (overrides: Partial<HolidayMonth> = {}): HolidayMonth => ({
  holidays: [],
  coverage: { firstYear: 2021, lastYear: 2031 },
  lastRefreshFailed: false,
  ...overrides,
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("getHolidayTitlesByDay", () => {
  it("names each day once per holiday, keeping every name on shared dates", () => {
    const titles = getHolidayTitlesByDay([
      holiday("Civic/Provincial Day", "2027-08-02", "2027-08-03"),
      holiday("Heritage Day (Alberta)", "2027-08-02", "2027-08-03"),
      holiday("Civic/Provincial Day", "2027-08-02", "2027-08-03"),
    ], 2027, 7, 31)
    expect([...titles]).toEqual([[2, ["Civic/Provincial Day", "Heritage Day (Alberta)"]]])
  })

  it("spreads multi-day entries over the month and respects the exclusive end", () => {
    const titles = getHolidayTitlesByDay([
      holiday("Winter Break", "2026-12-30", "2027-01-03"),
      holiday("New Year's Eve", "2027-12-31", "2028-01-01"),
    ], 2027, 0, 31)
    expect([...titles.keys()]).toEqual([1, 2])
    const december = getHolidayTitlesByDay([holiday("New Year's Eve", "2027-12-31", "2028-01-01")], 2027, 11, 31)
    expect([...december.keys()]).toEqual([31])
  })

  it("doesn't move dates with the machine's time zone", () => {
    const entries = [holiday("Canada Day", "2027-07-01", "2027-07-02")]
    for (const tz of ["Pacific/Kiritimati", "America/Los_Angeles"]) {
      vi.stubEnv("TZ", tz)
      expect([...getHolidayTitlesByDay(entries, 2027, 6, 31).keys()]).toEqual([1])
    }
  })
})

describe("getHolidayNotice", () => {
  it("stays quiet while loading and for a covered, fresh month", () => {
    expect(getHolidayNotice({ data: undefined, isError: false }, 2027)).toBeNull()
    expect(getHolidayNotice({ data: month(), isError: false }, 2027)).toBeNull()
    // An empty but covered month really has no holidays.
    expect(getHolidayNotice({ data: month({ holidays: [] }), isError: false }, 2031)).toBeNull()
  })

  it("explains missing coverage instead of implying there are no holidays", () => {
    expect(getHolidayNotice({ data: month({ coverage: null }), isError: false }, 2027)?.message)
      .toBe("Holiday dates aren't available yet.")
    expect(getHolidayNotice({ data: month(), isError: false }, 2032)?.message)
      .toBe("Holiday dates aren't available for this year yet.")
    expect(getHolidayNotice({ data: month(), isError: false }, 2020)?.message)
      .toBe("Holiday dates aren't available for this year.")
  })

  it("flags a failed refresh, and a failed read with a retry", () => {
    expect(getHolidayNotice({ data: month({ lastRefreshFailed: true }), isError: false }, 2027))
      .toEqual({ message: "Holidays may be out of date.", canRetry: false })
    expect(getHolidayNotice({ data: undefined, isError: true }, 2027))
      .toEqual({ message: "Holidays couldn't be loaded.", canRetry: true })
  })
})
