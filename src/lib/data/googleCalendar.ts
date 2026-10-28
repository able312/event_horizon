import type { GoogleCalendarSyncStatus } from "~/features/google-calendar/lib/googleCalendar"
import { api } from "../../../convex/_generated/api"
import { fetchSource, runAction } from "./backend"
import { toId } from "./ids"
import { sources } from "./sources"

/** Whether the linked Google event has the event's latest details (live through queries.ts). */
export function getGoogleCalendarSyncStatus(eventId: string): Promise<GoogleCalendarSyncStatus> {
  return fetchSource(sources.googleCalendar.syncStatus(eventId))
}

/**
 * Adds the event to the shared Google Calendar, or updates the Google event it's
 * linked to. The new link arrives through the event's live query.
 */
export function pushEventToGoogleCalendar(eventId: string): Promise<{ eventUrl: string }> {
  return runAction(api.googleCalendar.pushEvent, { eventId: toId<"events">(eventId) })
}

/** The linked Google event's link on calendar.google.com, for opening it. */
export function getGoogleCalendarEventUrl(eventId: string): Promise<{ eventUrl: string }> {
  return runAction(api.googleCalendar.getEventUrl, { eventId: toId<"events">(eventId) })
}

/**
 * Deletes the linked Google event from the shared calendar and clears the link.
 * `deletedFromGoogle` is false when the Google event was already gone.
 */
export function removeEventFromGoogleCalendar(eventId: string): Promise<{ deletedFromGoogle: boolean }> {
  return runAction(api.googleCalendar.removeEvent, { eventId: toId<"events">(eventId) })
}
