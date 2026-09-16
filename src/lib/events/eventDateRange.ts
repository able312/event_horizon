/**
 * Shared event start/end date range helpers.
 * Used by both the renderer forms and the Electron repository layer.
 */

export const EVENT_DATE_RANGE_ERROR = "endDateTime cannot be before startDateTime"

export function isValidEventDateRange(
  startDateTime: string | null | undefined,
  endDateTime: string | null | undefined,
): boolean {
  if (!startDateTime || !endDateTime) return true

  const startMs = Date.parse(startDateTime)
  const endMs = Date.parse(endDateTime)
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return true

  return endMs >= startMs
}

export function assertValidEventDateRange(
  startDateTime: string | null | undefined,
  endDateTime: string | null | undefined,
): void {
  if (!isValidEventDateRange(startDateTime, endDateTime)) {
    throw new Error(EVENT_DATE_RANGE_ERROR)
  }
}

/**
 * Auto-follow rule when the start datetime changes:
 * - If end is null and start is set → end becomes start
 * - If end would now be before start → move end to the new start's calendar day,
 *   keeping end's time-of-day; if still before start, set end equal to start
 * - Otherwise leave end alone
 * - Clearing start does not clear or change end
 */
export function resolveEndDateTimeForStart(
  _prevStart: string | null,
  newStart: string | null,
  currentEnd: string | null,
): string | null {
  if (!newStart) return currentEnd

  if (!currentEnd) return newStart

  const startMs = Date.parse(newStart)
  const endMs = Date.parse(currentEnd)
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return currentEnd

  if (endMs >= startMs) return currentEnd

  const startDate = new Date(newStart)
  const endDate = new Date(currentEnd)
  const shifted = new Date(startDate)
  shifted.setHours(
    endDate.getHours(),
    endDate.getMinutes(),
    endDate.getSeconds(),
    endDate.getMilliseconds(),
  )

  if (shifted.getTime() < startMs) {
    return newStart
  }

  return shifted.toISOString()
}
