/**
 * CompactEventLine
 *
 * One event as a single line (status glyph, title, guest count) for when the
 * grid is too tight for full cards. Clicking it toggles a popover with the details.
 *
 * Location: src/features/calendar/components/CompactEventLine.tsx
 */

import { Popover, PopoverTrigger } from "~/components/atoms/popover"
import type { Event, EventStatus } from "~/definitions/database"
import { EVENT_STATUS_LABELS } from "~/definitions/events/ui"
import { cn } from "~/lib/utils"
import {
  buildEventCardAccessibleName,
  getGuestCountRange,
  isMissingGoogleCalendarId,
} from "../lib/eventCardContent"
import CompactEventChipContent from "./CompactEventChipContent"
import CompactEventPopoverContent from "./CompactEventPopoverContent"
import { COMPACT_EVENT_STATUS_STYLES } from "./compactEventStatus"

type CompactEventLineProps = {
  event: Event
  clientName?: string | null
  onOpenEvent: () => void
  onStatusChange?: (status: EventStatus) => void
}

function CompactEventLine({ event, clientName, onOpenEvent, onStatusChange }: CompactEventLineProps) {
  const style = COMPACT_EVENT_STATUS_STYLES[event.status]
  const statusLabel = EVENT_STATUS_LABELS[event.status]
  const guestCount = getGuestCountRange(event)
  const showUploadWarning = isMissingGoogleCalendarId(event)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(clickEvent) => clickEvent.stopPropagation()}
          className={cn(
            "flex h-[22px] w-full items-center gap-1.5 rounded-sm px-1.5 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=open]:ring-[1.5px] data-[state=open]:ring-inset data-[state=open]:ring-foreground",
            style.rowClassName,
          )}
          title={`${statusLabel}: ${event.title}`}
          aria-label={buildEventCardAccessibleName({
            statusLabel,
            title: event.title,
            guestCount,
            notUploadedToGoogleCalendar: showUploadWarning,
          })}
          data-testid="calendar-compact-line"
        >
          <CompactEventChipContent event={event} />
        </button>
      </PopoverTrigger>
      <CompactEventPopoverContent
        event={event}
        clientName={clientName}
        showUploadWarning={showUploadWarning}
        onOpenEvent={onOpenEvent}
        onStatusChange={onStatusChange}
      />
    </Popover>
  )
}

export default CompactEventLine
