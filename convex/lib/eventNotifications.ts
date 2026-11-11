import type { Doc, Id } from "../_generated/dataModel"
import type { CompanyMutationCtx } from "./auth"
import {
  canMergeIntoNotification,
  createdEventFields,
  diffNotifiedFields,
  mergeEventChanges,
  type EventFieldChange,
  type NotifiedEventSnapshot,
} from "../../src/lib/events/eventChangeNotifications"

// Writes the team's event notifications. events.ts calls these from inside each
// create, update and delete, so a notification is part of the same transaction
// as the change it describes.

type EventSnapshot = NotifiedEventSnapshot & { id: Id<"events"> }

async function latestForEvent(ctx: CompanyMutationCtx, eventId: Id<"events">) {
  return ctx.db.query("eventNotifications").withIndex("by_event", q => q.eq("eventId", eventId)).order("desc").first()
}

async function deleteReceipts(ctx: CompanyMutationCtx, notificationId: Id<"eventNotifications">) {
  for (const receipt of await ctx.db.query("eventNotificationReceipts").withIndex("by_notification", q => q.eq("notificationId", notificationId)).collect()) {
    await ctx.db.delete("eventNotificationReceipts", receipt._id)
  }
}

async function deleteNotification(ctx: CompanyMutationCtx, notification: Doc<"eventNotifications">) {
  await deleteReceipts(ctx, notification._id)
  await ctx.db.delete("eventNotifications", notification._id)
}

/** Updated content shows as unread again for anyone who had read or dismissed the earlier version. */
async function rewriteNotification(ctx: CompanyMutationCtx, notification: Doc<"eventNotifications">, eventTitle: string, changes: EventFieldChange[]) {
  await deleteReceipts(ctx, notification._id)
  await ctx.db.patch("eventNotifications", notification._id, { eventTitle, changes, updatedAt: new Date().toISOString() })
}

async function insertNotification(ctx: CompanyMutationCtx, kind: Doc<"eventNotifications">["kind"], event: EventSnapshot, changes: EventFieldChange[]) {
  const now = new Date().toISOString()
  await ctx.db.insert("eventNotifications", { kind, eventId: event.id, eventTitle: event.title, changes, actorId: ctx.userId, createdAt: now, updatedAt: now })
}

export async function notifyEventCreated(ctx: CompanyMutationCtx, event: EventSnapshot): Promise<void> {
  await insertNotification(ctx, "created", event, createdEventFields(event))
}

/** Adds a notification when the update changed a notified field, or folds it into the author's recent one. */
export async function notifyEventUpdated(ctx: CompanyMutationCtx, before: EventSnapshot, after: EventSnapshot): Promise<void> {
  const changes = diffNotifiedFields(before, after)
  if (changes.length === 0) return
  const latest = await latestForEvent(ctx, after.id)
  if (latest && canMergeIntoNotification(latest, ctx.userId, new Date())) {
    // A new event's notification describes the event as it is now
    if (latest.kind === "created") return rewriteNotification(ctx, latest, after.title, createdEventFields(after))
    const merged = mergeEventChanges(latest.changes, changes)
    if (merged.length === 0) return deleteNotification(ctx, latest)
    return rewriteNotification(ctx, latest, after.title, merged)
  }
  await insertNotification(ctx, "updated", after, changes)
}

/**
 * The event's earlier notifications can no longer open it, so they're replaced by
 * one saying it was deleted. An event its author deletes right after adding it
 * never reached anyone's plans, so it leaves nothing behind.
 */
export async function notifyEventDeleted(ctx: CompanyMutationCtx, event: EventSnapshot): Promise<void> {
  const earlier = await ctx.db.query("eventNotifications").withIndex("by_event", q => q.eq("eventId", event.id)).collect()
  const latest = earlier[earlier.length - 1]
  const addedJustNow = latest?.kind === "created" && canMergeIntoNotification(latest, ctx.userId, new Date())
  for (const notification of earlier) await deleteNotification(ctx, notification)
  if (addedJustNow) return
  await insertNotification(ctx, "deleted", event, createdEventFields(event))
}
