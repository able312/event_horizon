/**
 * Which statuses an event may hold without a start date.
 * Used by both the renderer (to hint and guard) and the Convex event functions (to enforce).
 *
 * An event without a date is still a lead: it can only be a New Lead, or a Lost lead
 * that never got a date. Tentative, Confirmed and Complete all need a start date.
 */

import type { EventStatus } from "../../definitions/database.js"

export const STATUSES_ALLOWED_WITHOUT_DATE: readonly EventStatus[] = ["new_lead", "lost"]

export const EVENT_STATUS_REQUIRES_DATE_ERROR =
  "Set an event date before moving it past New Lead"

export function statusRequiresDate(status: EventStatus): boolean {
  return !STATUSES_ALLOWED_WITHOUT_DATE.includes(status)
}

export function isStatusAllowedForDate(
  status: EventStatus,
  startDateTime: string | null | undefined,
): boolean {
  return Boolean(startDateTime) || !statusRequiresDate(status)
}

export function assertStatusAllowedForDate(
  status: EventStatus,
  startDateTime: string | null | undefined,
): void {
  if (!isStatusAllowedForDate(status, startDateTime)) {
    throw new Error(EVENT_STATUS_REQUIRES_DATE_ERROR)
  }
}

/**
 * True when saving `nextStartDateTime` would remove the date from an event whose
 * current status needs one, so the user must confirm moving it back to New Lead.
 */
export function isDateRemovalBlockedByStatus(
  status: EventStatus,
  currentStartDateTime: string | null | undefined,
  nextStartDateTime: string | null | undefined,
): boolean {
  return Boolean(currentStartDateTime) && !nextStartDateTime && statusRequiresDate(status)
}
