/**
 * What saving a new start date will also do, so removing a date can be confirmed first.
 * Shared by the edit sidebar and the event detail date dialog.
 */

import type { EventStatus } from "../../definitions/database.js"
import { isStatusAllowedForDate } from "./eventStatusRules"

export type DateRemovalEffects = {
  /** The status to be saved needs a date, so it moves back to New Lead (eventStatusRules). */
  movesToNewLead: boolean
  /** The event is linked, so its Google event is deleted (googleCalendar.updateEvent). */
  removesFromGoogleCalendar: boolean
}

/** Null when the save has no side effects to confirm. */
export function dateRemovalEffects(save: {
  status: EventStatus
  currentStartDateTime: string | null | undefined
  nextStartDateTime: string | null | undefined
  calendarId: string | null | undefined
}): DateRemovalEffects | null {
  const removesDate = Boolean(save.currentStartDateTime) && !save.nextStartDateTime
  const effects = {
    movesToNewLead: !isStatusAllowedForDate(save.status, save.nextStartDateTime),
    removesFromGoogleCalendar: removesDate && Boolean(save.calendarId?.trim()),
  }
  return effects.movesToNewLead || effects.removesFromGoogleCalendar ? effects : null
}
