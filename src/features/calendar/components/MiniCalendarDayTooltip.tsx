/**
 * MiniCalendarDayTooltip
 *
 * Hovering or focusing a mini calendar day lists its events as compact chips.
 * Read only: the chips can't be clicked, so the tooltip never needs focus.
 * Days without events show no tooltip.
 *
 * Location: src/features/calendar/components/MiniCalendarDayTooltip.tsx
 */

import type { ReactNode } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/atoms/tooltip"
import type { Event } from "~/definitions/database"
import { cn } from "~/lib/utils"
import CompactEventChipContent from "./CompactEventChipContent"
import { COMPACT_EVENT_STATUS_STYLES } from "./compactEventStatus"

const OPEN_DELAY_MS = 200

type MiniCalendarDayTooltipProps = {
  date: Date
  events: Event[]
  /** Names what the day is to the request, e.g. "Preferred date" */
  label?: string | null
  children: ReactNode
}

function formatTooltipDate(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
}

function MiniCalendarDayTooltip({ date, events, label, children }: MiniCalendarDayTooltipProps) {
  if (events.length === 0) return children

  return (
    <Tooltip delayDuration={OPEN_DELAY_MS}>
      <TooltipTrigger asChild>
        <div className="flex size-full">{children}</div>
      </TooltipTrigger>
      <TooltipContent
        side="right"
        sideOffset={6}
        collisionPadding={8}
        className="w-60 border bg-popover p-2 text-popover-foreground shadow-md"
        arrowClassName="bg-popover fill-popover"
      >
        <div className="mb-1.5 flex items-baseline justify-between gap-2 px-1">
          <span className="text-xs font-semibold">{formatTooltipDate(date)}</span>
          {label ? <span className="text-[11px] text-muted-foreground">{label}</span> : null}
        </div>
        <ul className="space-y-0.5">
          {events.map((event) => (
            <li
              key={event.id}
              data-testid="mini-calendar-chip"
              className={cn(
                "pointer-events-none flex h-[22px] items-center gap-1.5 rounded-sm px-1.5",
                COMPACT_EVENT_STATUS_STYLES[event.status].rowClassName,
              )}
            >
              <CompactEventChipContent event={event} />
            </li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  )
}

export default MiniCalendarDayTooltip
