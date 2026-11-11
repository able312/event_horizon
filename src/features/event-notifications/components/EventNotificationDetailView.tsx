import { ArrowRight } from "lucide-react"

import type { EventNotification } from "~/definitions/database"
import { ContactSectionCard } from "~/features/contacts-directory/components/ContactSectionCard"
import {
  changeRows,
  EVENT_NOTIFICATION_KIND_LABELS,
  notificationAttribution,
  type ChangeRow,
} from "~/features/event-notifications/lib/eventNotificationText"
import { cn } from "~/lib/utils"

type EventNotificationDetailViewProps = {
  notification: EventNotification
}

const KIND_CLASSES: Record<EventNotification["kind"], string> = {
  created: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  updated: "bg-sky-50 text-sky-700 border border-sky-200",
  deleted: "bg-rose-50 text-rose-700 border border-rose-200",
}

const CARD_TITLES: Record<EventNotification["kind"], string> = {
  created: "Event details",
  updated: "What changed",
  deleted: "What was deleted",
}

function formatWhen(iso: string): string {
  const date = new Date(iso)
  return `${date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })} at ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
}

const Empty: React.FC<{ text: string }> = ({ text }) => <span className="text-muted-foreground italic">{text}</span>

/** Before and after for one changed field. */
const ChangeRowItem: React.FC<{ row: ChangeRow }> = ({ row }) => (
  <div className="grid grid-cols-[6rem_1fr] gap-3">
    <dt className="pt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">{row.label}</dt>
    <dd className="flex min-w-0 flex-wrap items-center gap-2 text-sm select-text">
      <span className="text-muted-foreground line-through decoration-muted-foreground/50">{row.from ?? <Empty text="None" />}</span>
      <ArrowRight aria-label="changed to" className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="font-medium">{row.to ?? <Empty text="None" />}</span>
    </dd>
  </div>
)

/** A field of a new or deleted event. */
const DetailRowItem: React.FC<{ row: ChangeRow }> = ({ row }) => (
  <div className="grid grid-cols-[6rem_1fr] gap-3">
    <dt className="pt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">{row.label}</dt>
    <dd className="min-w-0 text-sm select-text">{row.to ?? <Empty text="None" />}</dd>
  </div>
)

/** What a teammate did to an event: who, when, and each field before and after. */
const EventNotificationDetailView: React.FC<EventNotificationDetailViewProps> = ({ notification }) => {
  const rows = changeRows(notification.changes)
  const Row = notification.kind === "updated" ? ChangeRowItem : DetailRowItem
  const edited = notification.updatedAt !== notification.createdAt

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 overflow-y-auto p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight select-text">{notification.eventTitle || "Untitled event"}</h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className={cn("rounded px-2 py-0.5 text-xs", KIND_CLASSES[notification.kind])}>
            {EVENT_NOTIFICATION_KIND_LABELS[notification.kind]}
          </span>
          <span>
            {notificationAttribution(notification)} · {formatWhen(notification.createdAt)}
            {edited ? ` (last change ${formatWhen(notification.updatedAt)})` : ""}
          </span>
        </div>
      </div>

      <ContactSectionCard title={CARD_TITLES[notification.kind]}>
        {rows.length > 0 ? (
          <dl className="space-y-2.5">
            {rows.map((row) => <Row key={row.field} row={row} />)}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">No details recorded.</p>
        )}
      </ContactSectionCard>

      {notification.eventExists ? null : (
        <p className="text-sm text-muted-foreground">
          {notification.kind === "deleted"
            ? "This event was deleted, so it can no longer be opened."
            : "This event has since been deleted, so it can no longer be opened."}
        </p>
      )}
    </div>
  )
}

export default EventNotificationDetailView
