import type { EventStatus, EventType } from "../../definitions/database.js"

// Which event edits the team is told about, and how a teammate's run of quick
// edits collapses into one Inbox notification. Shared by Convex (which writes the
// notifications in convex/lib/eventNotifications.ts) and the renderer.

/** The fields whose changes notify the team: the name, the date and time, the type and the status. */
export const NOTIFIED_EVENT_FIELDS = ["title", "startDateTime", "endDateTime", "type", "status"] as const

export type NotifiedEventField = (typeof NOTIFIED_EVENT_FIELDS)[number]

/** One changed field: values as stored on the event. `from` is null for a new event. */
export type EventFieldChange = {
  field: NotifiedEventField
  from: string | null
  to: string | null
}

export const EVENT_NOTIFICATION_KINDS = ["created", "updated", "deleted"] as const
export type EventNotificationKind = (typeof EVENT_NOTIFICATION_KINDS)[number]

/** The notified fields of an event. */
export type NotifiedEventSnapshot = {
  title: string
  type: EventType
  status: EventStatus
  startDateTime: string | null
  endDateTime: string | null
}

/**
 * Edits by the same person to the same event within this window update their
 * earlier notification instead of adding another, so fixing a typo or setting the
 * date right after creating an event doesn't send the team several alerts.
 */
export const EVENT_NOTIFICATION_MERGE_WINDOW_MS = 10 * 60 * 1000

/** Notifications older than this are pruned (convex/crons.ts). */
export const EVENT_NOTIFICATION_RETENTION_DAYS = 30

/** The notified fields an update changed, in NOTIFIED_EVENT_FIELDS order. */
export function diffNotifiedFields(before: NotifiedEventSnapshot, after: NotifiedEventSnapshot): EventFieldChange[] {
  return NOTIFIED_EVENT_FIELDS.filter((field) => before[field] !== after[field]).map((field) => ({
    field,
    from: before[field],
    to: after[field],
  }))
}

/** A new event's notified fields, as changes from nothing. Empty fields are left out. */
export function createdEventFields(event: NotifiedEventSnapshot): EventFieldChange[] {
  return NOTIFIED_EVENT_FIELDS.filter((field) => event[field] !== null && event[field] !== "").map((field) => ({
    field,
    from: null,
    to: event[field],
  }))
}

/**
 * Folds a later edit into an earlier notification's changes: each field keeps its
 * original `from` and takes the latest `to`. A field changed and changed back drops
 * out, so an edit that was undone leaves nothing to report.
 */
export function mergeEventChanges(earlier: readonly EventFieldChange[], later: readonly EventFieldChange[]): EventFieldChange[] {
  const merged = new Map<NotifiedEventField, EventFieldChange>()
  for (const change of earlier) merged.set(change.field, { ...change })
  for (const change of later) {
    const existing = merged.get(change.field)
    merged.set(change.field, existing ? { ...existing, to: change.to } : { ...change })
  }
  return NOTIFIED_EVENT_FIELDS.flatMap((field) => {
    const change = merged.get(field)
    return change && change.from !== change.to ? [change] : []
  })
}

/** Whether a new edit should update the notification `earlier` instead of adding one. */
export function canMergeIntoNotification(
  earlier: { kind: EventNotificationKind; actorId: string; createdAt: string },
  actorId: string,
  now: Date,
): boolean {
  if (earlier.kind === "deleted" || earlier.actorId !== actorId) return false
  const age = now.getTime() - Date.parse(earlier.createdAt)
  return age >= 0 && age <= EVENT_NOTIFICATION_MERGE_WINDOW_MS
}
