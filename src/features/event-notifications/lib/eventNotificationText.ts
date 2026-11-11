import type { EventNotification, EventStatus, EventType } from "~/definitions/database"
import { EVENT_STATUS_LABELS, EVENT_TYPE_LABELS } from "~/definitions/events/labels"
import type { EventFieldChange, NotifiedEventField } from "~/lib/events/eventChangeNotifications"

// How an event notification reads in the Inbox: a one-line summary for the
// sidebar card, and labelled before/after rows for the body.

export const EVENT_NOTIFICATION_KIND_LABELS: Record<EventNotification["kind"], string> = {
  created: "New event",
  updated: "Updated",
  deleted: "Deleted",
}

const FIELD_LABELS: Record<NotifiedEventField, string> = {
  title: "Name",
  startDateTime: "Starts",
  endDateTime: "Ends",
  type: "Type",
  status: "Status",
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
}

function formatDayAndTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return `${formatDay(iso)}, ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
}

/** A stored field value as people read it; null when the field was empty. */
export function formatFieldValue(field: NotifiedEventField, value: string | null): string | null {
  if (value === null || value === "") return null
  switch (field) {
    case "title": return value
    case "startDateTime":
    case "endDateTime": return formatDayAndTime(value)
    case "type": return EVENT_TYPE_LABELS[value as EventType] ?? value
    case "status": return EVENT_STATUS_LABELS[value as EventStatus] ?? value
  }
}

export type ChangeRow = { field: NotifiedEventField; label: string; from: string | null; to: string | null }

/** The body's rows: before and after for an update, the event's details for a new or deleted event. */
export function changeRows(changes: readonly EventFieldChange[]): ChangeRow[] {
  return changes.map((change) => ({
    field: change.field,
    label: FIELD_LABELS[change.field],
    from: formatFieldValue(change.field, change.from),
    to: formatFieldValue(change.field, change.to),
  }))
}

function sameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

/** A short phrase for one change, e.g. "Moved to Sat, Jun 13, 2027" or "Status → Confirmed". */
function changePhrase(change: EventFieldChange, all: readonly EventFieldChange[]): string | null {
  switch (change.field) {
    case "title":
      return change.from ? `Renamed from “${change.from}”` : "Named"
    case "startDateTime":
      if (!change.to) return "Date removed"
      if (!change.from) return `Date set to ${formatDay(change.to)}`
      return sameDay(change.from, change.to) ? "Start time changed" : `Moved to ${formatDay(change.to)}`
    case "endDateTime":
      // A moved event changes both; the start says it
      if (all.some((other) => other.field === "startDateTime") || !change.to) return null
      return "End time changed"
    case "type":
      return `Type → ${formatFieldValue("type", change.to) ?? "none"}`
    case "status":
      return `Status → ${formatFieldValue("status", change.to) ?? "none"}`
  }
}

function eventDetailsSummary(changes: readonly EventFieldChange[]): string {
  const value = (field: NotifiedEventField) => changes.find((change) => change.field === field)?.to ?? null
  const start = value("startDateTime")
  const type = formatFieldValue("type", value("type"))
  const status = formatFieldValue("status", value("status"))
  return [start ? formatDay(start) : "No date yet", type, status].filter(Boolean).join(" · ")
}

/** The sidebar card's second line. */
export function notificationSummary(notification: Pick<EventNotification, "kind" | "changes">): string {
  if (notification.kind !== "updated") return eventDetailsSummary(notification.changes)
  const phrases = notification.changes.flatMap((change) => changePhrase(change, notification.changes) ?? [])
  if (phrases.length <= 2) return phrases.join(" · ")
  return `${phrases.slice(0, 2).join(" · ")} · +${phrases.length - 2} more`
}

/** "Tess added this event", "Tess changed this event"… */
export function notificationAttribution(notification: Pick<EventNotification, "kind" | "actorName">): string {
  const who = notification.actorName ?? "A teammate"
  const did = { created: "added this event", updated: "changed this event", deleted: "deleted this event" }[notification.kind]
  return `${who} ${did}`
}
