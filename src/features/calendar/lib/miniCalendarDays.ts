import type { Event } from "~/definitions/database"
import { EVENT_STATUS_DOT_CLASSES } from "~/definitions/events/ui"

/** Events keyed by their local start day (see getDayKey), earliest first. */
export type EventsByDay = Map<string, Event[]>

const DEFAULT_EVENT_STATUS_DOT_CLASS = "bg-stone-500"
const EVENT_STATUS_DOT_CLASSES_BY_KEY: Partial<Record<string, string>> = EVENT_STATUS_DOT_CLASSES

/** "2026-04-09" for a local date. */
export function getDayKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/** Groups events by the local day they start on. Undated or unparseable events are left out. */
export function groupEventsByDay(events: Event[]): EventsByDay {
  const eventsByDay: EventsByDay = new Map()
  const datedEvents = events
    .map((event) => ({ event, start: event.startDateTime ? new Date(event.startDateTime) : null }))
    .filter((entry): entry is { event: Event; start: Date } => entry.start !== null && !Number.isNaN(entry.start.getTime()))
    .sort((a, b) => a.start.getTime() - b.start.getTime())

  for (const { event, start } of datedEvents) {
    const dayKey = getDayKey(start)
    eventsByDay.set(dayKey, [...(eventsByDay.get(dayKey) ?? []), event])
  }

  return eventsByDay
}

/** Unknown statuses get a neutral dot rather than none. */
export function getEventStatusDotClass(status: string): string {
  return EVENT_STATUS_DOT_CLASSES_BY_KEY[status] ?? DEFAULT_EVENT_STATUS_DOT_CLASS
}
