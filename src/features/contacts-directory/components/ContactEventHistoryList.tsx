import { CalendarDays, Star } from "lucide-react"
import { Link } from "react-router"

import type { ContactEventHistory } from "~/definitions/contacts"
import { EVENT_STATUS_LABELS } from "~/definitions/events/ui"
import { getRoleBadgeClass } from "~/features/contacts/lib/contactStyles"
import { ROLE_LABELS } from "~/features/contacts/lib/eventContactsPanel"
import { useContactEventHistory } from "~/hooks/useEventContacts"
import { formatDate } from "~/lib/formatters"
import { cn } from "~/lib/utils"

import { groupEventHistory } from "../lib/eventHistory"

const EventHistoryCard: React.FC<{ row: ContactEventHistory }> = ({ row }) => {
  const removed = Boolean(row.removedAt)
  const roleLabel =
    row.role === "vendor" && row.vendorCategory ? `${row.vendorCategory.label} vendor` : ROLE_LABELS[row.role].singular

  return (
    <li className={cn("rounded-lg border border-border bg-card p-4 transition-colors hover:border-orange-500/50", removed && "opacity-60")}>
      <div className="flex items-start justify-between gap-2">
        <Link to={`/events/${row.eventId}`} className="min-w-0 truncate text-sm font-semibold hover:underline">
          {row.eventTitle}
        </Link>
        {row.isPrimary ? (
          <Star className="size-3.5 shrink-0 fill-orange-400 text-orange-400" aria-label="Primary contact on this event" />
        ) : null}
      </div>

      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarDays className="size-3.5" aria-hidden />
        {row.eventStartDateTime ? formatDate(row.eventStartDateTime) : "Date not set"}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
        <span className={cn("rounded-xs px-1.5 font-medium", getRoleBadgeClass(row.role, row.vendorCategory))}>{roleLabel}</span>
        <span className="rounded-xs bg-stone-100 px-1.5 text-stone-600">{EVENT_STATUS_LABELS[row.eventStatus]}</span>
        {removed ? (
          <span className="rounded-xs bg-stone-100 px-1.5 uppercase tracking-wide text-stone-500">Removed</span>
        ) : null}
      </div>
    </li>
  )
}

const EventGroup: React.FC<{ title: string; rows: ContactEventHistory[] }> = ({ title, rows }) =>
  rows.length === 0 ? null : (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-muted-foreground">
        {title} · {rows.length}
      </h4>
      <ul className="grid gap-3 xl:grid-cols-2">
        {rows.map((row) => (
          <EventHistoryCard key={row.eventContactId} row={row} />
        ))}
      </ul>
    </div>
  )

type ContactEventHistoryListProps = {
  contactId: string
}

export const ContactEventHistoryList: React.FC<ContactEventHistoryListProps> = ({ contactId }) => {
  const { data: history = [], isLoading } = useContactEventHistory(contactId)
  const { upcoming, past } = groupEventHistory(history, new Date())

  return (
    <section className="space-y-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Event history{history.length > 0 ? ` · ${history.length}` : ""}
      </h3>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading events…</p>
      ) : history.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          No events yet.
        </p>
      ) : (
        <>
          <EventGroup title="Upcoming" rows={upcoming} />
          <EventGroup title="Past" rows={past} />
        </>
      )}
    </section>
  )
}
