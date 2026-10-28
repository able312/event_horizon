import type { PrimaryClient } from "../definitions/contacts.js"
import type { Event } from "../definitions/database.js"
import { EVENT_STATUS_LABELS, EVENT_TYPE_LABELS } from "../definitions/events/labels.js"
import { formatTouchpointsPlainText } from "../features/touchpoints/lib/formatTouchpointsPlainText.js"
import type { TouchpointPlainItem } from "../features/touchpoints/types.js"

// Builds the shared Google Calendar event for an Event Horizon event. Convex sends it
// (convex/googleCalendar.ts), so this module avoids the renderer-only "~" imports.

const MISSING_PLACEHOLDER = "Not set"

export type GoogleCalendarEventInput = Pick<
  Event,
  | "title"
  | "type"
  | "status"
  | "startDateTime"
  | "endDateTime"
  | "internalNotes"
  | "minGuests"
  | "maxGuests"
  | "guestCountFinal"
>

function toValidDate(dateValue: string): Date {
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date value: ${dateValue}`)
  }
  return date
}

function cleanText(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export type GoogleCalendarDescriptionOptions = {
  incompleteTouchpoints?: TouchpointPlainItem[]
  client?: Pick<PrimaryClient, "displayName" | "email" | "phone"> | null
}

function buildGoogleCalendarDescription(
  event: GoogleCalendarEventInput,
  options: GoogleCalendarDescriptionOptions = {},
): string {
  const eventType = EVENT_TYPE_LABELS[event.type] ?? event.type
  const eventStatus = EVENT_STATUS_LABELS[event.status] ?? event.status
  const internalNote = cleanText(event.internalNotes)
  const name = cleanText(options.client?.displayName) ?? MISSING_PLACEHOLDER
  const email = cleanText(options.client?.email) ?? MISSING_PLACEHOLDER
  const phone = cleanText(options.client?.phone) ?? MISSING_PLACEHOLDER

  const isGuestCountFinal = event.guestCountFinal === 1
  const minGuests = event.minGuests ?? MISSING_PLACEHOLDER
  const maxGuests = event.maxGuests ?? MISSING_PLACEHOLDER
  const guestLine = isGuestCountFinal
    ? `${maxGuests} guests (final)`
    : `${minGuests} - ${maxGuests} guests`

  const lines = [`EVENT TYPE: ${eventType}`, `STATUS: ${eventStatus}`, ""]
  if (internalNote) {
    lines.push(internalNote, "")
  }

  lines.push(
    `GUESTS: ${guestLine}`,
    "",
    "CLIENT INFO",
    `Name: ${name}`,
    `Email: ${email}`,
    `Phone: ${phone}`,
  )

  const touchpointsBlock = formatTouchpointsPlainText(options.incompleteTouchpoints ?? [])
  if (touchpointsBlock) {
    lines.push("", touchpointsBlock)
  }

  return lines.join("\n")
}

/** The Calendar API fields Event Horizon owns; anything else set in Google is left alone. */
export type GoogleCalendarEventBody = {
  summary: string
  description: string
  start: { dateTime: string }
  end: { dateTime: string }
}

export function buildGoogleCalendarEventBody(
  event: GoogleCalendarEventInput,
  options: GoogleCalendarDescriptionOptions = {},
): GoogleCalendarEventBody {
  if (!event.startDateTime || !event.endDateTime) {
    throw new Error("Event startDateTime and endDateTime are required")
  }

  return {
    summary: cleanText(event.title) ?? "Untitled Event",
    description: buildGoogleCalendarDescription(event, options),
    start: { dateTime: toValidDate(event.startDateTime).toISOString() },
    end: { dateTime: toValidDate(event.endDateTime).toISOString() },
  }
}

/**
 * A short, stable fingerprint of a body. Convex keeps the fingerprint of the last body sent
 * to Google, so the app can tell when the event has changed since without storing a copy.
 */
export function googleCalendarBodyFingerprint(body: GoogleCalendarEventBody): string {
  const text = JSON.stringify([body.summary, body.description, body.start.dateTime, body.end.dateTime])
  // 32-bit FNV-1a: plenty to tell one revision of an event from the next
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, "0")
}

/**
 * How the linked Google event compares with Event Horizon:
 * - `synced`: Google has the latest details.
 * - `out_of_date`: the details changed after the last update.
 * - `unknown`: linked, but no update from Event Horizon is on record for that link
 *   (linked by hand, or last updated before changes were tracked), or the event has no dates.
 */
export type GoogleCalendarSyncStatus = "not_linked" | "synced" | "out_of_date" | "unknown"
