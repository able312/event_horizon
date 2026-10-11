import type { NewContact } from "~/definitions/contacts"
import type { NewEvent, Event, UpdateEvent } from "~/definitions/database"
import type { EventSearchRequest, EventSearchResponse } from "~/definitions/ipc"
import type { IcsImportEventInput, IcsImportInsertResult } from "~/definitions/events/icsImport"
import { api } from "../../../convex/_generated/api"
import { fetchSource, pickFields, runMutation, runQuery } from "./backend"
import { CONTACT_FIELDS } from "./contacts"
import { toId } from "./ids"
import { sources } from "./sources"

/** Fields a create or update may set; the server owns IDs and timestamps. */
const EVENT_FIELDS = [
  "title", "type", "status", "startDateTime", "endDateTime", "minGuests", "maxGuests", "guestCountFinal",
  "driveFolderId", "calendarId", "clientNotes", "internalNotes", "isInternal",
] as const

/** `month` is YYYY-MM; events start within that month in desktop local time. */
export function getEventsByMonth(month: string): Promise<Event[]> {
  return fetchSource(sources.events.month(month))
}

export function getUnscheduledEvents(): Promise<Event[]> {
  return fetchSource(sources.events.unscheduled())
}

export function searchEvents(payload: EventSearchRequest): Promise<EventSearchResponse> {
  return fetchSource(sources.events.search(payload))
}

export function getEventById(id: string): Promise<Event> {
  return fetchSource(sources.events.byId(id))
}

/** When a client is given, the back end also assigns them as the event's primary client. */
export function createEvent(newEvent: NewEvent, client?: NewContact | null): Promise<Event> {
  return runMutation(api.events.create, {
    input: pickFields(newEvent, EVENT_FIELDS),
    client: client ? pickFields(client, CONTACT_FIELDS) : null,
  })
}

export function updateEvent(id: string, updates: UpdateEvent): Promise<Event> {
  return runMutation(api.events.update, { id: toId<"events">(id), updates: pickFields(updates, EVENT_FIELDS) })
}

export function deleteEvent(id: string): Promise<boolean> {
  return runMutation(api.events.remove, { id: toId<"events">(id) })
}

export function getEventsByCalendarIds(calendarIds: string[]): Promise<Event[]> {
  return runQuery(api.events.getByCalendarIds, { calendarIds })
}

/** Events starting at or after `startFrom` and before `startTo` (ISO datetimes). */
export function getEventsStartingBetween(startFrom: string, startTo: string): Promise<Event[]> {
  return runQuery(api.events.getStartingBetween, { startFrom, startTo })
}

/** Creates events from calendar rows, skipping calendar ids that already belong to an event. */
export function importCalendarEvents(rows: IcsImportEventInput[]): Promise<IcsImportInsertResult> {
  return runMutation(api.events.importFromCalendar, {
    rows: rows.map((row) => pickFields(row, ["calendarId", "title", "startDateTime", "endDateTime", "internalNotes"])),
  })
}
