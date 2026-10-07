/**
 * CalendarEventCard
 *
 * One event on the calendar grid: a status header band (icon, label, guest count)
 * over a neutral body (title, primary client). The whole card is a single button.
 *
 * Location: src/features/calendar/components/CalendarEventCard.tsx
 */

import { AlertTriangle, Users } from "lucide-react"
import type { Event } from "~/definitions/database"
import { cn } from "~/lib/utils"
import {
  buildEventCardAccessibleName,
  formatGuestCount,
  getGuestCountRange,
  isMissingGoogleCalendarId,
} from "../lib/eventCardContent"
import { EVENT_CARD_STATUS_STYLES } from "./eventCardStatus"

const NOT_UPLOADED_WARNING = "Not uploaded to Google Calendar."

type CalendarEventCardProps = {
  event: Event
  clientName?: string | null
  onClick: () => void
}

function CalendarEventCard({ event, clientName, onClick }: CalendarEventCardProps) {
  const status = EVENT_CARD_STATUS_STYLES[event.status]
  const guestCount = getGuestCountRange(event)
  const showUploadWarning = isMissingGoogleCalendarId(event)
  const { Icon } = status

  return (
    <button
      type="button"
      onClick={(clickEvent) => {
        clickEvent.stopPropagation()
        onClick()
      }}
      className={cn(
        "flex w-full flex-col overflow-hidden rounded-md text-left outline-none hover:opacity-80 focus-visible:ring-[3px] focus-visible:ring-ring/50",
        status.cardClassName,
      )}
      title={event.title}
      aria-label={buildEventCardAccessibleName({
        statusLabel: status.label,
        title: event.title,
        clientName,
        guestCount,
        notUploadedToGoogleCalendar: showUploadWarning,
      })}
    >
      <span
        className={cn("flex w-full flex-wrap items-center gap-x-1 gap-y-0.5 px-2 py-1", status.bandClassName)}
        data-testid="calendar-event-card-band"
      >
        {/* Label never truncates; the guest count wraps to its own line when the cell is narrow */}
        <span className="flex shrink-0 items-center gap-1">
          <Icon className={cn("size-3 shrink-0", status.className)} aria-hidden="true" />
          <span className="text-[10px] font-semibold uppercase leading-none tracking-[0.05em]">
            {status.label}
          </span>
        </span>
        {guestCount ? (
          <span className="ml-auto flex shrink-0 items-center gap-0.5 text-[11px] font-medium leading-none tabular-nums">
            <Users className="size-3" aria-hidden="true" />
            {formatGuestCount(guestCount)}
          </span>
        ) : null}
      </span>

      <span className="flex w-full flex-col gap-0.5 px-2 pt-1.5 pb-2">
        <span className="flex items-start gap-1">
          <span className={cn("line-clamp-2 min-w-0 flex-1 text-[13px] leading-[1.3]", status.titleClassName)}>
            {event.title}
          </span>
          {showUploadWarning ? (
            <span title={NOT_UPLOADED_WARNING} className="inline-flex pt-0.5">
              <AlertTriangle className="size-3 shrink-0 text-yellow-600" aria-hidden="true" />
            </span>
          ) : null}
        </span>
        {clientName ? (
          <span className="truncate text-[11px] leading-[1.35] text-muted-foreground" title={clientName}>
            {clientName}
          </span>
        ) : null}
      </span>
    </button>
  )
}

export default CalendarEventCard
