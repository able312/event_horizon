import { useQuery } from "@tanstack/react-query"

import type { HolidayEntry } from "~/definitions/holidays"
import { holidayQueries } from "~/lib/data/queries"
import { getCurrentMonthParam, normalizeMonthParam } from "~/lib/months"
import { getHolidayNotice, type HolidayNotice } from "../lib/calendarHolidays"

const NO_HOLIDAYS: HolidayEntry[] = []

type MonthHolidays = {
  /** Only this month's: never the previous month's while loading, so no day is mislabelled. */
  holidays: HolidayEntry[]
  notice: HolidayNotice | null
  retry: () => void
  isRetrying: boolean
}

/**
 * Shared holidays for the calendar month (YYYY-MM). Supplementary: a failure only
 * produces a notice and never blocks the bookings calendar.
 */
export function useMonthHolidays(month: string | null | undefined): MonthHolidays {
  const selectedMonth = normalizeMonthParam(month) ?? getCurrentMonthParam()
  const query = useQuery(holidayQueries.month(selectedMonth))
  return {
    holidays: query.data?.holidays ?? NO_HOLIDAYS,
    notice: getHolidayNotice(query, Number(selectedMonth.slice(0, 4))),
    retry: () => void query.refetch(),
    isRetrying: query.isFetching,
  }
}
