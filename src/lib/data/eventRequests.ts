import type { AssignContactTarget } from "~/definitions/contacts"
import type { Event, EventRequest, NewEvent } from "~/definitions/database"
import { api } from "../../../convex/_generated/api"
import { fetchSource, pickFields, runMutation } from "./backend"
import { toContactTargetArgs } from "./eventContacts"
import { EVENT_FIELDS } from "./events"
import { toId } from "./ids"
import { sources } from "./sources"

/** Website requests waiting for review, newest first. */
export function getPendingEventRequests(): Promise<EventRequest[]> {
  return fetchSource(sources.eventRequests.pending())
}

/** Creates the event and its primary client from the reviewed form, and marks the request accepted, in one transaction. */
export function acceptEventRequest(id: string, newEvent: NewEvent, client: AssignContactTarget): Promise<Event> {
  return runMutation(api.eventRequests.accept, {
    id: toId<"eventRequests">(id),
    input: pickFields(newEvent, EVENT_FIELDS),
    client: toContactTargetArgs(client),
  })
}

/** Undoes a dismiss, putting the request back in the Inbox. */
export async function restoreEventRequest(id: string): Promise<void> {
  await runMutation(api.eventRequests.restore, { id: toId<"eventRequests">(id) })
}

export async function dismissEventRequest(id: string): Promise<void> {
  await runMutation(api.eventRequests.dismiss, { id: toId<"eventRequests">(id) })
}
