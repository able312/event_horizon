import type { EventRequest } from "~/definitions/database"
import { EVENT_TYPE_LABELS } from "~/definitions/events/ui"
import { formatRequestDate, requestClientName, requestTitle } from "~/features/calendar/lib/eventRequestPrefill"
import { formatReceivedAt } from "~/features/calendar/lib/inboxList"
import { cn } from "~/lib/utils"

type InboxRequestCardProps = {
  request: EventRequest
  selected: boolean
  onSelect: (request: EventRequest) => void
}

/** A website request in the Inbox sidebar: what it is, who asked, and when they want it. */
export const InboxRequestCard: React.FC<InboxRequestCardProps> = ({ request, selected, onSelect }) => {
  const when = request.preferredDate ? formatRequestDate(request.preferredDate) : "No date yet"

  return (
    <li>
      <button
        type="button"
        aria-current={selected ? "true" : undefined}
        className={cn(
          "block w-full border-l-2 px-3 py-2.5 text-left transition-colors",
          selected ? "border-orange-500 bg-white/10" : "border-transparent hover:bg-white/5",
        )}
        onClick={() => onSelect(request)}
      >
        <span className="flex items-baseline gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-100">{requestTitle(request)}</span>
          <span className="shrink-0 text-[11px] text-stone-400">{formatReceivedAt(request.submittedAt)}</span>
        </span>
        <span className="block truncate text-xs text-stone-300">
          {requestClientName(request)} · {EVENT_TYPE_LABELS[request.eventType]}
        </span>
        <span className="block truncate text-xs text-stone-400">
          {when} · {request.guestCount} guests
        </span>
      </button>
    </li>
  )
}
