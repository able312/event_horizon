/**
 * The reminder touchpoint an event gets when it has no date, so an undated lead shows up
 * in Touchpoints instead of sitting unseen off the calendar. The Convex event functions
 * add it when an event is created without a date or has its date removed; after that it's
 * an ordinary touchpoint the team can edit, complete or delete.
 */

import type { EventStatus } from "../../definitions/database.js"
import { toIsoDateOnly } from "./buildCommonTouchpoints.js"

export const UNDATED_EVENT_TOUCHPOINT_TITLE = "Set a date for this event"

/** Days from today until the reminder is due. A fixed default for now; a setting can replace it later. */
export const UNDATED_EVENT_TOUCHPOINT_DUE_DAYS = 7

type DateState = { startDateTime: string | null }

/**
 * True when an event has just become undated: created without a date (`before` is null)
 * or had its date removed. Lost events are left alone, since there's nothing to schedule.
 */
export function needsUndatedEventTouchpoint(
  before: DateState | null,
  after: DateState & { status: EventStatus },
): boolean {
  if (after.startDateTime !== null || after.status === "lost") return false
  return before === null || before.startDateTime !== null
}

/** The calendar date `days` after `now` in `timeZone`, stored like every touchpoint due date. */
export function dueDateDaysFrom(now: Date, days: number, timeZone?: string): string {
  const today = new Date(toIsoDateOnly(now, timeZone))
  today.setUTCDate(today.getUTCDate() + days)
  return today.toISOString()
}

export function buildUndatedEventTouchpoint(now: Date, timeZone?: string): { title: string; dueDate: string } {
  return {
    title: UNDATED_EVENT_TOUCHPOINT_TITLE,
    dueDate: dueDateDaysFrom(now, UNDATED_EVENT_TOUCHPOINT_DUE_DAYS, timeZone),
  }
}
