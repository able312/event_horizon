/**
 * MiniCalendarDayMarkers
 *
 * The event markers under a mini calendar date: one dot per event, coloured
 * by event status (new lead is a diamond, tentative a hollow ring), or a count once a day has more than two.
 *
 * Location: src/features/calendar/components/MiniCalendarDayMarkers.tsx
 */

import type { Event } from "~/definitions/database"
import { cn } from "~/lib/utils"
import { getEventStatusDotClass } from "../lib/miniCalendarDays"

type MiniCalendarDayMarkersProps = {
  events: Event[]
}

function MiniCalendarDayMarkers({ events }: MiniCalendarDayMarkersProps) {
  if (events.length === 0) return null

  if (events.length > 2) {
    return (
      <span
        data-mini-marker="count"
        className="inline-flex min-w-4 items-center justify-center rounded-full bg-stone-600 px-1 py-0.5 text-[9px] font-medium text-white"
      >
        {events.length}
      </span>
    )
  }

  return (
    <span
      data-mini-marker={events.length === 2 ? "dots" : "dot"}
      className="inline-flex items-center justify-center gap-1 pt-1"
    >
      {events.map((event) => (
        <span
          key={event.id}
          data-mini-marker-dot={event.status}
          className={cn("h-1.5 w-1.5 rounded-full", getEventStatusDotClass(event.status))}
        />
      ))}
    </span>
  )
}

export default MiniCalendarDayMarkers
