/**
 * Pure parsing helpers for DatePicker.
 */

import { parseLocalDateKey } from "~/lib/months"

const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/**
 * Parse text typed into the DatePicker input.
 * ISO `YYYY-MM-DD` is read as a local calendar date; `new Date()` would read
 * it as UTC midnight and land on the previous day west of UTC.
 * Returns null for text that isn't a valid date.
 */
export function parseTypedDate(raw: string): Date | null {
  const trimmed = raw.trim()
  if (ISO_DATE_ONLY.test(trimmed)) return parseLocalDateKey(trimmed)

  const parsed = new Date(trimmed)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}
