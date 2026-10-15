import type { EventStatus } from "~/definitions/database"
import { isValidEventDateRange } from "~/lib/events/eventDateRange"
import { isStatusAllowedForDate } from "~/lib/events/eventStatusRules"

export function isEventFormValid(values: {
  title: string
  startDateTime: string | null
  endDateTime: string | null
}): boolean {
  return (
    values.title.trim().length > 0 &&
    isValidEventDateRange(values.startDateTime, values.endDateTime)
  )
}

/** A new event must also have a date for any status past New Lead (edits confirm a walk-back instead). */
export function isCreateEventFormValid(values: {
  title: string
  status: EventStatus
  startDateTime: string | null
  endDateTime: string | null
}): boolean {
  return isEventFormValid(values) && isStatusAllowedForDate(values.status, values.startDateTime)
}
