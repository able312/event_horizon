import { combineDateWithTime } from "~/components/atoms/dateTimeInput.lib"
import type { EventRequest, NewEvent } from "~/definitions/database"
import { EVENT_TYPE_LABELS } from "~/definitions/events/ui"
import { formatDate } from "~/lib/formatters"
import type { EventFormValues } from "~/features/calendar/forms/EventFormFields"
import type { ClientSelection } from "~/features/calendar/forms/clientPickerForm"

/** What the create-event form starts with when reviewing a website request. */
export type CreateEventPrefill = {
  values: EventFormValues
  client: ClientSelection
  /** Not shown in the form; saved with the event so nothing the client sent is lost. */
  notes: Pick<NewEvent, "clientNotes" | "internalNotes">
}

/** A yyyy-MM-dd form answer as a local calendar day (Date.parse would read it as UTC midnight). */
function parseRequestDate(date: string): Date | null {
  const [year, month, day] = date.split("-").map(Number)
  if (!year || !month || !day) return null
  const parsed = new Date(year, month - 1, day)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/** "Jun 20, 2027"; the answer as sent when it isn't a valid date. */
export function formatRequestDate(date: string): string {
  const parsed = parseRequestDate(date)
  return parsed ? parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : date
}

/** "6:30 PM" from an HH:mm answer. */
export function formatRequestTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return time
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

export function requestClientName(request: Pick<EventRequest, "firstName" | "lastName">): string {
  return `${request.firstName} ${request.lastName}`.trim()
}

/** The client's own event name, or "<organization or last name> <type>" when they left it blank. */
export function requestTitle(request: Pick<EventRequest, "eventName" | "organizationName" | "lastName" | "eventType">): string {
  return request.eventName ?? `${request.organizationName ?? request.lastName} ${EVENT_TYPE_LABELS[request.eventType]}`
}

/** The preferred day at the requested start time (midnight when no time was given), or null without a date. */
function toStartDateTime(request: EventRequest): string | null {
  const day = request.preferredDate ? parseRequestDate(request.preferredDate) : null
  return day ? combineDateWithTime(day, request.startTime) : null
}

/** Everything the event fields don't hold, so staff can still see it after the request leaves the Inbox. */
function toInternalNotes(request: EventRequest): string {
  const lines = [`Website request submitted ${formatDate(request.submittedAt)}`]
  if (request.organizationName) lines.push(`Organization: ${request.organizationName}`)
  if (request.startTime) lines.push(`Requested start time: ${formatRequestTime(request.startTime)}`)
  if (request.alternateDate) lines.push(`Alternate date: ${formatRequestDate(request.alternateDate)}`)
  if (request.referralSource) lines.push(`Heard about us: ${request.referralSource}`)
  for (const { question, answer } of request.extraAnswers) lines.push(`${question}: ${answer}`)
  return lines.join("\n")
}

export function eventRequestToPrefill(request: EventRequest): CreateEventPrefill {
  const startDateTime = toStartDateTime(request)
  return {
    values: {
      title: requestTitle(request),
      type: request.eventType,
      status: "new_lead",
      startDateTime,
      endDateTime: startDateTime,
      minGuests: 0,
      maxGuests: request.guestCount,
    },
    // A new contact by default; if the email already belongs to one, the form offers it ("Back to search" searches by email).
    client: {
      mode: "create",
      query: request.email,
      values: { name: requestClientName(request), email: request.email, phone: request.phone },
    },
    notes: {
      clientNotes: request.details,
      internalNotes: toInternalNotes(request),
    },
  }
}
