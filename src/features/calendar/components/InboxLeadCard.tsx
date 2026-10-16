import type { PrimaryClient } from "~/definitions/contacts"
import type { Event } from "~/definitions/database"
import { EVENT_TYPE_LABELS } from "~/definitions/events/ui"
import EventItemContextMenu from "~/features/calendar/interactions/EventItemContextMenu"
import { formatDate } from "~/lib/formatters"

type InboxLeadCardProps = {
  lead: Event
  client: PrimaryClient | undefined
  onEdit: (event: Event) => void
  onDelete: (eventId: string) => void
}

/** A New Lead event in the Inbox sidebar. Click to edit; right-click for edit and delete. */
export const InboxLeadCard: React.FC<InboxLeadCardProps> = ({ lead, client, onEdit, onDelete }) => {
  const details = [client?.displayName, EVENT_TYPE_LABELS[lead.type], lead.maxGuests ? `${lead.maxGuests} guests` : null]
    .filter(Boolean)
    .join(" · ")

  return (
    <li>
      <EventItemContextMenu event={lead} onEdit={onEdit} onDelete={onDelete}>
        <button
          type="button"
          className="block w-full border-l-2 border-transparent px-3 py-2 text-left transition-colors hover:bg-white/5"
          onClick={() => onEdit(lead)}
        >
          <span className="flex items-baseline gap-2">
            <span className="min-w-0 flex-1 truncate text-sm text-stone-100">{lead.title || "Untitled event"}</span>
            <span className="shrink-0 text-[11px] text-stone-400">
              {lead.startDateTime ? formatDate(lead.startDateTime) : "No date"}
            </span>
          </span>
          <span className="block truncate text-xs text-stone-400">{details}</span>
        </button>
      </EventItemContextMenu>
    </li>
  )
}
