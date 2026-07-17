import type { Event } from "~/definitions/database"
import { EVENT_STATUS_LABELS, EVENT_TYPE_LABELS } from "~/definitions/events/ui"
import { formatTouchpointsPlainText } from "~/features/touchpoints/lib/formatTouchpointsPlainText"
import type { TouchpointPlainItem } from "~/features/touchpoints/types"

const GOOGLE_CREATE_URL = "https://calendar.google.com/calendar/u/0/r/eventedit"
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
  | "clientName"
  | "clientEmail"
  | "clientPhone"
  | "calendarId"
>

function toValidDate(dateValue: string): Date {
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date value: ${dateValue}`)
  }
  return date
}

function toDateDigits(date: Date): string {
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(
    date.getUTCDate(),
  ).padStart(2, "0")}`
}

function toTimeDigits(date: Date): string {
  return `${String(date.getUTCHours()).padStart(2, "0")}${String(date.getUTCMinutes()).padStart(
    2,
    "0",
  )}${String(date.getUTCSeconds()).padStart(2, "0")}`
}

function cleanText(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function formatGoogleCalendarDateUtc(isoDate: string): string {
  const date = toValidDate(isoDate)
  return `${toDateDigits(date)}T${toTimeDigits(date)}Z`
}

export type GoogleCalendarDescriptionOptions = {
  incompleteTouchpoints?: TouchpointPlainItem[]
}

export function buildGoogleCalendarDescription(
  event: GoogleCalendarEventInput,
  options: GoogleCalendarDescriptionOptions = {},
): string {
  const eventType = EVENT_TYPE_LABELS[event.type] ?? event.type
  const eventStatus = EVENT_STATUS_LABELS[event.status] ?? event.status
  const internalNote = cleanText(event.internalNotes)
  const name = cleanText(event.clientName) ?? MISSING_PLACEHOLDER
  const email = cleanText(event.clientEmail) ?? MISSING_PLACEHOLDER
  const phone = cleanText(event.clientPhone) ?? MISSING_PLACEHOLDER

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

function buildBaseGoogleCalendarUrl(
  event: GoogleCalendarEventInput,
  baseUrl: string,
  options: GoogleCalendarDescriptionOptions = {},
): string {
  if (!event.startDateTime || !event.endDateTime) {
    throw new Error("Event startDateTime and endDateTime are required")
  }

  const url = new URL(baseUrl)
  const title = cleanText(event.title) ?? "Untitled Event"
  url.searchParams.set("text", title)
  url.searchParams.set(
    "dates",
    `${formatGoogleCalendarDateUtc(event.startDateTime)}/${formatGoogleCalendarDateUtc(event.endDateTime)}`,
  )
  url.searchParams.set("details", buildGoogleCalendarDescription(event, options))
  return url.toString()
}

export function buildGoogleCalendarCreateUrl(
  event: GoogleCalendarEventInput,
  options: GoogleCalendarDescriptionOptions = {},
): string {
  return buildBaseGoogleCalendarUrl(event, GOOGLE_CREATE_URL, options)
}

export function buildGoogleCalendarUpdateUrl(
  event: GoogleCalendarEventInput,
  options: GoogleCalendarDescriptionOptions = {},
): string {
  const calendarId = cleanText(event.calendarId)
  if (!calendarId) {
    throw new Error("calendarId is required for update URL")
  }

  const baseUrl = `https://calendar.google.com/calendar/u/0/r/eventedit/${encodeURIComponent(calendarId)}`
  return buildBaseGoogleCalendarUrl(event, baseUrl, options)
}
