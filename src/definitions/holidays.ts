// ============================================================================
// Holidays (shared, read-only; cached from Google's public Canadian calendar)
// ============================================================================

/** One holiday or observance on its civil dates, as labelled by the feed. */
export type HolidayEntry = {
  /** Feed UID, with `#YYYY-MM-DD` appended for a recurring entry's occurrence. */
  id: string
  title: string
  /** YYYY-MM-DD, first day. */
  startDate: string
  /** YYYY-MM-DD, the day after the last day (exclusive, as in the feed). */
  endDate: string
}

/** The years the cached feed actually supplied; not a promise that every holiday is listed. */
export type HolidayCoverage = {
  firstYear: number
  lastYear: number
}

export type HolidayMonth = {
  /** Entries that touch the month, including ones that start before it. */
  holidays: HolidayEntry[]
  /** Null until the first successful refresh. */
  coverage: HolidayCoverage | null
  /** The most recent refresh failed, so the cached holidays may be out of date. */
  lastRefreshFailed: boolean
}
