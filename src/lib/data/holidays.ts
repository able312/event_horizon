import type { HolidayMonth } from "~/definitions/holidays"
import { fetchSource } from "./backend"
import { sources } from "./sources"

/** Shared holidays touching the month (YYYY-MM), from the backend's weekly cache of Google's Canadian feed. */
export function getHolidaysForMonth(month: string): Promise<HolidayMonth> {
  return fetchSource(sources.holidays.month(month))
}
