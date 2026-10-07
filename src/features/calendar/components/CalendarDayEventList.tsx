/**
 * CalendarDayEventList
 *
 * The event cards inside one calendar day cell. Shows as many cards as fit
 * (up to maxVisible) and moves the rest behind a "+N more" popover.
 *
 * Location: src/features/calendar/components/CalendarDayEventList.tsx
 */

import { useRef } from "react"
import type { PrimaryClient } from "~/definitions/contacts"
import type { Event } from "~/definitions/database"
import { Popover, PopoverContent, PopoverTrigger } from "~/components/atoms/popover"
import { useFittingItemCount } from "../hooks/useFittingItemCount"
import EventItemContextMenu from "../interactions/EventItemContextMenu"
import CalendarEventCard from "./CalendarEventCard"

type CalendarDayEventListProps = {
  day: number
  events: Event[]
  maxVisible: number
  clientsByEventId?: Record<string, PrimaryClient>
  onEventClick: (eventId: string) => void
  onEventEdit?: (event: Event) => void
  onEventDelete?: (eventId: string) => void
}

function CalendarDayEventList({
  day,
  events,
  maxVisible,
  clientsByEventId,
  onEventClick,
  onEventEdit,
  onEventDelete,
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

  return (
    <>
      {/* Cards that don't fit stay in layout (invisible) so they can still be measured */}
      <div ref={listRef} className="min-h-0 flex-1 space-y-1 overflow-hidden">
        {candidateEvents.map((event, index) => (
          <div key={event.id} className={index >= fittingCount ? "invisible" : undefined}>
            {renderCard(event)}
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
              className="w-full shrink-0 rounded border border-dashed border-stone-300 px-1 py-0.5 text-left text-[10px] text-muted-foreground hover:bg-stone-50"
              aria-label={`+${hiddenCount} more events`}
            >
              +{hiddenCount} more
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-72 p-2"
            align="start"
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
