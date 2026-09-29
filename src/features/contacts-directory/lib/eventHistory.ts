import type { ContactEventHistory } from "~/definitions/contacts"

/** Newest first; events with no scheduled start (unscheduled) sort last. */
export function sortEventHistory(rows: ContactEventHistory[]): ContactEventHistory[] {
  return [...rows].sort((a, b) => {
    if (!a.eventStartDateTime && !b.eventStartDateTime) return 0
    if (!a.eventStartDateTime) return 1
    if (!b.eventStartDateTime) return -1
    return b.eventStartDateTime.localeCompare(a.eventStartDateTime)
  })
}

/**
 * Splits history into upcoming and past. Upcoming lists soonest first, with unscheduled events
 * (which haven't happened yet) last; past lists newest first.
 */
export function groupEventHistory(
  rows: ContactEventHistory[],
  now: Date,
): { upcoming: ContactEventHistory[]; past: ContactEventHistory[] } {
  const nowIso = now.toISOString()
  const isPast = (row: ContactEventHistory) => row.eventStartDateTime !== null && row.eventStartDateTime < nowIso

  const sorted = sortEventHistory(rows)
  const past = sorted.filter(isPast)
  const upcoming = sorted.filter((row) => !isPast(row))
  const unscheduled = upcoming.filter((row) => !row.eventStartDateTime)
  const scheduled = upcoming.filter((row) => row.eventStartDateTime).reverse()

  return { upcoming: [...scheduled, ...unscheduled], past }
}
