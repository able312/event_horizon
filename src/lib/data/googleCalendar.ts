import { api } from "../../../convex/_generated/api"
import { runAction } from "./backend"
import { toId } from "./ids"

/**
 * Adds the event to the shared Google Calendar, or updates the Google event it's
 * linked to. The new link arrives through the event's live query.
 */
export function pushEventToGoogleCalendar(eventId: string): Promise<{ eventUrl: string }> {
  return runAction(api.googleCalendar.pushEvent, { eventId: toId<"events">(eventId) })
}

/**
 * Deletes the linked Google event from the shared calendar and clears the link.
 * `deletedFromGoogle` is false when the Google event was already gone.
 */
export function removeEventFromGoogleCalendar(eventId: string): Promise<{ deletedFromGoogle: boolean }> {
  return runAction(api.googleCalendar.removeEvent, { eventId: toId<"events">(eventId) })
}
