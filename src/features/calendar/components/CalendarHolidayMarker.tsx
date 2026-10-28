/**
 * CalendarHolidayMarker
 *
 * One small flag beside a day number when the shared holiday feed lists that date.
 * Names show in a tooltip on hover or keyboard focus (all of them, one per line),
 * and a click keeps it open. It's read-only: a click never reaches the day cell, so
 * it can't start a booking.
 *
 * Location: src/features/calendar/components/CalendarHolidayMarker.tsx
 */

import { useState } from "react"
import { Flag } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/atoms/tooltip"

type CalendarHolidayMarkerProps = {
  titles: string[]
  /** Keep the tooltip shut, e.g. while an event popover is open, so it doesn't cover it. */
  suppressed?: boolean
  /**
   * Called when a click opens the names. The click stops at the marker, which also
   * stops Radix dismissing an open event popover, so the owner closes it here.
   */
  onClickOpen?: () => void
}

function CalendarHolidayMarker({ titles, suppressed = false, onClickOpen }: CalendarHolidayMarkerProps) {
  const [open, setOpen] = useState(false)

  return (
    <Tooltip open={open && !suppressed} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`Holidays and observances: ${titles.join("; ")}`}
          className="flex size-5 shrink-0 items-center justify-center rounded-md bg-sky-100 text-sky-700 hover:bg-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
          // Radix closes a tooltip when its trigger is pressed; keep it open instead.
          onPointerDown={(event) => event.preventDefault()}
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onClickOpen?.()
            setOpen(true)
          }}
          data-holiday-marker
        >
          <Flag aria-hidden="true" className="size-3.5 fill-sky-700/30" strokeWidth={2.25} />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        align="start"
        sideOffset={4}
        className="max-w-60 text-left text-wrap"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="mb-0.5 text-[10px] uppercase tracking-wide opacity-75">Holidays / observances</p>
        <ul className="space-y-0.5">
          {titles.map((title) => (
            <li key={title} className="break-words">{title}</li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  )
}

export default CalendarHolidayMarker
