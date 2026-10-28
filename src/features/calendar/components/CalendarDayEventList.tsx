/**
 * CalendarDayEventList
 *
 * The header and event cards inside one calendar day cell. Shows as many cards
 * as fit (up to maxVisible) and moves the rest behind a "+N more" popover.
 * The header is one line: the caller's `header` (date, holiday marker) on the
 * left and the "+N more" trigger on the right, so neither overlaps the other and
 * the trigger takes no vertical space away from the cards. In narrow cells the
 * trigger shortens to "+N".
 * In compact mode each visible event is a single CompactEventLine instead of
 * a card, and maxVisible doesn't apply: lines fill whatever height the cell has.
 *
 * Location: src/features/calendar/components/CalendarDayEventList.tsx
 */

import { useRef, type ReactNode } from "react"
import type { PrimaryClient } from "~/definitions/contacts"
import type { Event, EventStatus } from "~/definitions/database"
import { Popover, PopoverContent, PopoverTrigger } from "~/components/atoms/popover"
import { useFittingItemCount } from "../hooks/useFittingItemCount"
import { useReleaseOpenOnUnmount } from "../hooks/useReleaseOpenOnUnmount"
import EventItemContextMenu from "../interactions/EventItemContextMenu"
import CalendarEventCard from "./CalendarEventCard"
import CompactEventLine from "./CompactEventLine"

type CalendarDayEventListProps = {
  day: number
  /** Left side of the header line: the day number and any markers beside it */
  header: ReactNode
  /** Shown above the events without counting towards them, e.g. the draft chip */
  leadingItem?: ReactNode
  events: Event[]
  /** Most full cards to show; compact lines are limited only by height */
  maxVisible: number
  /** Show single compact lines instead of full cards */
  compact?: boolean
  clientsByEventId?: Record<string, PrimaryClient>
  /** Key of the grid's one open popover, or null */
  openPopoverKey: string | null
  onPopoverOpenChange: (key: string, open: boolean) => void
  onEventClick: (eventId: string) => void
  onEventEdit?: (event: Event) => void
  onEventDelete?: (eventId: string) => void
  onEventStatusChange?: (eventId: string, status: EventStatus) => void
}

function CalendarDayEventList({
  day,
  header,
  leadingItem,
  events,
  maxVisible,
  compact = false,
  clientsByEventId,
  openPopoverKey,
  onPopoverOpenChange,
  onEventClick,
  onEventEdit,
  onEventDelete,
  onEventStatusChange,
}: CalendarDayEventListProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const candidateEvents = compact ? events : events.slice(0, maxVisible)
  const fittingCount = useFittingItemCount(listRef, candidateEvents.length)
  const hiddenCount = events.length - fittingCount
  const morePopoverKey = `more-${day}`
  // A popover that closes because another opened must not pull focus back to its
  // trigger: Radix would read that as a focus-outside and dismiss the new one.
  const handleCloseAutoFocus = (event: globalThis.Event) => {
    if (openPopoverKey !== null) event.preventDefault()
  }

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
        open={openPopoverKey === `event-${event.id}`}
        onOpenChange={(open) => onPopoverOpenChange(`event-${event.id}`, open)}
        onOpenEvent={() => onEventClick(event.id)}
        onCloseAutoFocus={handleCloseAutoFocus}
        onStatusChange={
          onEventStatusChange ? (status) => onEventStatusChange(event.id, status) : undefined
        }
      />
    </EventItemContextMenu>
  )

  return (
    <>
      {/* A container, so the trigger can shorten when the cell is narrow */}
      <div className="@container mb-1 flex min-h-5 shrink-0 items-center gap-1" data-day-header>
        <div className="flex shrink-0 items-center gap-1">{header}</div>
        {hiddenCount > 0 ? (
          <MoreEventsPopover
            hiddenCount={hiddenCount}
            open={openPopoverKey === morePopoverKey}
            onOpenChange={(open) => onPopoverOpenChange(morePopoverKey, open)}
            onCloseAutoFocus={handleCloseAutoFocus}
          >
            {events.map((event) => (
              <div key={`more-${day}-${event.id}`}>{renderCard(event)}</div>
            ))}
          </MoreEventsPopover>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden" data-testid={`calendar-day-events-${day}`}>
        {leadingItem}
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
      </div>
    </>
  )
}

type MoreEventsPopoverProps = {
  hiddenCount: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onCloseAutoFocus: (event: globalThis.Event) => void
  children: ReactNode
}

function MoreEventsPopover({ hiddenCount, open, onOpenChange, onCloseAutoFocus, children }: MoreEventsPopoverProps) {
  // The trigger disappears once every event fits, which Radix doesn't report as a close.
  useReleaseOpenOnUnmount(open, onOpenChange)

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
          }}
          className="ml-auto h-5 shrink-0 whitespace-nowrap rounded px-1 text-[10px] leading-5 text-muted-foreground hover:bg-stone-100 hover:text-foreground"
          aria-label={`+${hiddenCount} more events`}
        >
          +{hiddenCount}
          <span className="hidden @min-[7.5rem]:inline"> more</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-2"
        align="end"
        onCloseAutoFocus={onCloseAutoFocus}
        onClick={(e) => {
          e.stopPropagation()
        }}
      >
        <div className="max-h-96 space-y-1.5 overflow-y-auto">{children}</div>
      </PopoverContent>
    </Popover>
  )
}

export default CalendarDayEventList
