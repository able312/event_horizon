import type { EventNotification } from "~/definitions/database"
import { api } from "../../../convex/_generated/api"
import { fetchSource, runMutation } from "./backend"
import { toId } from "./ids"
import { sources } from "./sources"

/** Teammates' recent event changes for the signed-in user's Inbox, newest first. */
export function getInboxEventNotifications(): Promise<EventNotification[]> {
  return fetchSource(sources.eventNotifications.inbox())
}

export async function markEventNotificationRead(id: string): Promise<void> {
  await runMutation(api.eventNotifications.markRead, { id: toId<"eventNotifications">(id) })
}

export async function markAllEventNotificationsRead(): Promise<void> {
  await runMutation(api.eventNotifications.markAllRead, {})
}

/** Removes it from the signed-in user's Inbox only. */
export async function dismissEventNotification(id: string): Promise<void> {
  await runMutation(api.eventNotifications.dismiss, { id: toId<"eventNotifications">(id) })
}

/** Undoes a dismiss. */
export async function restoreEventNotification(id: string): Promise<void> {
  await runMutation(api.eventNotifications.restore, { id: toId<"eventNotifications">(id) })
}
