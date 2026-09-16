/**
 * Pure date/time combine helpers for DateTimeInput.
 */

export function extractTimeString(iso: string | null): string {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return date.toTimeString().slice(0, 5)
}

/**
 * Combine a calendar date with an HH:mm time string.
 * Empty/null time → midnight (00:00).
 */
export function combineDateWithTime(date: Date, time: string | null): string {
  const next = new Date(date)
  if (!time) {
    next.setHours(0, 0, 0, 0)
    return next.toISOString()
  }

  const [hoursRaw, minutesRaw] = time.split(":")
  const hours = Number(hoursRaw)
  const minutes = Number(minutesRaw)

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    next.setHours(0, 0, 0, 0)
    return next.toISOString()
  }

  next.setHours(hours, minutes, 0, 0)
  return next.toISOString()
}

/**
 * Replace the calendar day of an existing ISO datetime while preserving its time.
 * When there is no existing value, use midnight.
 */
export function replaceDatePreservingTime(iso: string | null, date: Date): string {
  if (!iso) {
    return combineDateWithTime(date, null)
  }

  const current = new Date(iso)
  if (Number.isNaN(current.getTime())) {
    return combineDateWithTime(date, null)
  }

  const next = new Date(date)
  next.setHours(
    current.getHours(),
    current.getMinutes(),
    current.getSeconds(),
    current.getMilliseconds(),
  )
  return next.toISOString()
}
