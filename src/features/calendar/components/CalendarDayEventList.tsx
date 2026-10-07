/**
 * CalendarDayEventList
 *
 * The event cards inside one calendar day cell. Shows as many cards as fit
 * (up to maxVisible) and moves the rest behind a "+N more" popover.
 * The "+N more" trigger is absolutely positioned into the top-right corner of
 * the day cell (the parent cell must be `relative`), across from the date, so
 * it doesn't take vertical space away from the cards.
 * In compact mode each visible event is a single CompactEventLine instead of
 * a card; the fit and "+N more" rules are the same in both modes.
 *
 * Location: src/features/calendar/components/CalendarDayEventList.tsx
 */

import { useRef } from "react"
import type { PrimaryClient } from "~/definitions/contacts"
import type { Event, EventStatus } from "~/definitions/database"
import { Popover, PopoverContent, PopoverTrigger } from "~/components/atoms/popover"
import { useFittingItemCount } from "../hooks/useFittingItemCount"
import EventItemContextMenu from "../interactions/EventItemContextMenu"
import CalendarEventCard from "./CalendarEventCard"
import CompactEventLine from "./CompactEventLine"

type CalendarDayEventListProps = {
  day: number
  events: Event[]
  maxVisible: number
  /** Show single compact lines instead of full cards */
  compact?: boolean
  clientsByEventId?: Record<string, PrimaryClient>
  onEventClick: (eventId: string) => void
  onEventEdit?: (event: Event) => void
  onEventDelete?: (eventId: string) => void
  onEventStatusChange?: (eventId: string, status: EventStatus) => void
}

function CalendarDayEventList({
  day,
  events,
  maxVisible,
  compact = false,
  clientsByEventId,
  onEventClick,
  onEventEdit,
  onEventDelete,
  onEventStatusChange,
}: CalendarDayEventListProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const candidateEvents = events.slice(0, maxVisible)
  const fittingCount = useFittingItemCount(listRef, candidateEvents.length)
  const hiddenCount = events.length - fittingCount

  const renderCard = (event: Event) => (
    <EventItemContextMenu event={event} onEdit={onEventEdit} onDelete={onEventDelete}>
      <CalendarEventCard
        event={event}
        clientName={clientsByEventId?.[event.id]?.displayName}
        onClick={() => onEventClick(event.id)}
      />
    </EventItemContextMenu>
  )

  const renderCompactLine = (event: Event) => (
    <EventItemContextMenu event={event} onEdit={onEventEdit} onDelete={onEventDelete}>
      <CompactEventLine
        event={event}
        clientName={clientsByEventId?.[event.id]?.displayName}
        onOpenEvent={() => onEventClick(event.id)}
        onStatusChange={
          onEventStatusChange ? (status) => onEventStatusChange(event.id, status) : undefined
        }
      />
    </EventItemContextMenu>
  )

  return (
    <>
      {/* Items that don't fit stay in layout (invisible) so they can still be measured */}
      <div
        ref={listRef}
        className={`min-h-0 flex-1 overflow-hidden ${compact ? "space-y-0.5" : "space-y-1"}`}
        data-density={compact ? "compact" : "full"}
      >
        {candidateEvents.map((event, index) => (
          <div key={event.id} className={index >= fittingCount ? "invisible" : undefined}>
            {compact ? renderCompactLine(event) : renderCard(event)}
          </div>
        ))}
      </div>
      {hiddenCount > 0 ? (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
              }}
              className="absolute right-1 top-1 h-5 rounded px-1 text-[10px] leading-5 text-muted-foreground hover:bg-stone-100 hover:text-foreground"
              aria-label={`+${hiddenCount} more events`}
            >
              +{hiddenCount} more
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-72 p-2"
            align="end"
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            <div className="max-h-96 space-y-1.5 overflow-y-auto">
              {events.map((event) => (
                <div key={`more-${day}-${event.id}`}>{renderCard(event)}</div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      ) : null}
    </>
  )
}

export default CalendarDayEventList
