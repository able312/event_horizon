/**
 * CompactEventPopoverContent
 *
 * Everything a compact calendar line leaves out: title, status chip, date,
 * client, guest count, then "Open event" and "Change status".
 *
 * Location: src/features/calendar/components/CompactEventPopoverContent.tsx
 */

import type { ReactNode } from "react"
import { AlertTriangle, Calendar, User, Users, X } from "lucide-react"
import { Button } from "~/components/atoms/button"
import { PopoverClose, PopoverContent } from "~/components/atoms/popover"
import type { Event, EventStatus } from "~/definitions/database"
import { EVENT_STATUS_COLORS, EVENT_STATUS_ICONS, EVENT_STATUS_LABELS } from "~/definitions/events/ui"
import { cn } from "~/lib/utils"
import { describeGuestCount, formatEventPopoverDate, getGuestCountRange } from "../lib/eventCardContent"
import EventStatusChangeMenu from "./EventStatusChangeMenu"

type CompactEventPopoverContentProps = {
  event: Event
  clientName?: string | null
  showUploadWarning: boolean
  onOpenEvent: () => void
  onStatusChange?: (status: EventStatus) => void
}

function DetailRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-[13px] text-foreground/80">
      <span className="flex h-5 shrink-0 items-center text-muted-foreground">{icon}</span>
      <span className="min-w-0 leading-5">{children}</span>
    </div>
  )
}

function CompactEventPopoverContent({
  event,
  clientName,
  showUploadWarning,
  onOpenEvent,
  onStatusChange,
}: CompactEventPopoverContentProps) {
  const { Icon: StatusIcon, className: statusIconClassName } = EVENT_STATUS_ICONS[event.status]
  const date = formatEventPopoverDate(event.startDateTime)
  const guestCount = getGuestCountRange(event)

  return (
    <PopoverContent
      side="right"
      align="start"
      sideOffset={12}
      alignOffset={-12}
      collisionPadding={8}
      aria-label={event.title}
      className="flex flex-col gap-2 px-4 pt-3.5 pb-4 shadow-lg"
      // The popover is portalled, but React still bubbles its clicks to the day cell.
      onClick={(clickEvent) => clickEvent.stopPropagation()}
    >
      <div className="flex items-start gap-2">
        <h3 className="min-w-0 flex-1 pt-1 text-base font-semibold leading-[1.3] break-words">{event.title}</h3>
        <PopoverClose asChild>
          <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground" aria-label="Close">
            <X aria-hidden="true" />
          </Button>
        </PopoverClose>
      </div>

      <span
        className={cn(
          "mb-1 inline-flex h-[22px] w-fit items-center gap-1 rounded-full px-2 text-xs font-semibold",
          EVENT_STATUS_COLORS[event.status],
        )}
      >
        <StatusIcon className={cn("size-3 shrink-0", statusIconClassName)} aria-hidden="true" />
        {EVENT_STATUS_LABELS[event.status]}
      </span>

      {date ? <DetailRow icon={<Calendar className="size-4" aria-hidden="true" />}>{date}</DetailRow> : null}
      {clientName ? (
        <DetailRow icon={<User className="size-4" aria-hidden="true" />}>
          <span className="break-words">{clientName}</span>
        </DetailRow>
      ) : null}
      {guestCount ? (
        <DetailRow icon={<Users className="size-4" aria-hidden="true" />}>{describeGuestCount(guestCount)}</DetailRow>
      ) : null}
      {showUploadWarning ? (
        <DetailRow icon={<AlertTriangle className="size-4 text-yellow-600" aria-hidden="true" />}>
          Not uploaded to Google Calendar.
        </DetailRow>
      ) : null}

      <div className="mt-1 flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={onOpenEvent}>
          Open event
        </Button>
        {onStatusChange ? <EventStatusChangeMenu status={event.status} onStatusChange={onStatusChange} /> : null}
      </div>
    </PopoverContent>
  )
}

export default CompactEventPopoverContent
