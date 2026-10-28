import type { HolidayEntry, HolidayMonth } from "~/definitions/holidays"

// The shared holiday layer on the month grid. Holidays are civil dates (YYYY-MM-DD),
// so days are matched by string, never through Date objects or time zones.

function toDateKey(year: number, monthIndex: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

/**
 * Holiday names per day of the month (1-based), in feed order without repeats.
 * A multi-day entry names every day it covers; its end date is exclusive.
 */
export function getHolidayTitlesByDay(
  holidays: HolidayEntry[],
  year: number,
  monthIndex: number,
  daysInMonth: number,
): Map<number, string[]> {
  const titlesByDay = new Map<number, string[]>()
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = toDateKey(year, monthIndex, day)
    const titles = holidays
      .filter((holiday) => holiday.startDate <= dateKey && holiday.endDate > dateKey)
      .map((holiday) => holiday.title)
    if (titles.length > 0) titlesByDay.set(day, [...new Set(titles)])
  }
  return titlesByDay
}

export type HolidayNotice = {
  message: string
  /** Offer a retry: the read itself failed, rather than the backend lacking data. */
  canRetry: boolean
}

type HolidayQueryState = {
  data: HolidayMonth | undefined
  isError: boolean
}

/**
 * The one-line note shown beside the month controls, or null when the month's
 * holidays can be trusted (or are still loading). Never claims a month has no
 * holidays when the cache can't say.
 */
export function getHolidayNotice({ data, isError }: HolidayQueryState, year: number): HolidayNotice | null {
  if (!data) return isError ? { message: "Holidays couldn't be loaded.", canRetry: true } : null
  const { coverage } = data
  if (!coverage) return { message: "Holiday dates aren't available yet.", canRetry: false }
  if (year > coverage.lastYear) return { message: "Holiday dates aren't available for this year yet.", canRetry: false }
  if (year < coverage.firstYear) return { message: "Holiday dates aren't available for this year.", canRetry: false }
  if (data.lastRefreshFailed) return { message: "Holidays may be out of date.", canRetry: false }
  return null
}
