/**
 * RequestMiniCalendar
 *
 * A month calendar on a website request that marks the client's preferred
 * (solid ring) and alternate (dashed ring) dates alongside the events already
 * booked, so the team can judge availability without leaving the Inbox.
 * Hovering a day with events lists them as compact chips. Days aren't
 * selectable; the arrows flip months to look for other dates.
 *
 * Location: src/features/calendar/views/RequestMiniCalendar.tsx
 */

import React, { useCallback, useMemo, useState } from "react"

import { Button } from "~/components/atoms/button"
import { Calendar, CalendarDayButton } from "~/components/atoms/calendar"
import type { EventRequest } from "~/definitions/database"
import MiniCalendarDayMarkers from "~/features/calendar/components/MiniCalendarDayMarkers"
import MiniCalendarDayTooltip from "~/features/calendar/components/MiniCalendarDayTooltip"
import { useAdjacentMonthsEvents } from "~/features/calendar/hooks/useAdjacentMonthsEvents"
import { getDayKey, groupEventsByDay } from "~/features/calendar/lib/miniCalendarDays"
import { getBookedEvents, getRequestCalendarDates, getRequestCalendarMonth } from "~/features/calendar/lib/requestCalendar"
import { getCurrentMonthParam, toMonthStartDate } from "~/lib/months"
import { cn } from "~/lib/utils"

type RequestMiniCalendarProps = {
  request: Pick<EventRequest, "preferredDate" | "alternateDate">
}

const PREFERRED_DAY_CLASS = "bg-orange-50 ring-2 ring-inset ring-foreground"
const ALTERNATE_DAY_CLASS = "outline-2 outline-dashed -outline-offset-2 outline-foreground/70"

// Clicking a day does nothing, but passing a handler keeps the days as focusable
// buttons so keyboard users can open the same tooltips.
const ignoreDayClick = () => {}

function getRequestDayLabel(modifiers: Record<string, boolean>): string | null {
  if (modifiers.preferred) return "Preferred date"
  if (modifiers.alternate) return "Alternate date"
  return null
}

type LegendItemProps = {
  swatchClassName: string
  label: string
}

const LegendItem: React.FC<LegendItemProps> = ({ swatchClassName, label }) => (
  <li className="flex items-center gap-1.5">
    <span className={cn("size-3.5 shrink-0 rounded-sm", swatchClassName)} aria-hidden="true" />
    {label}
  </li>
)

const RequestMiniCalendar: React.FC<RequestMiniCalendarProps> = ({ request }) => {
  const dates = useMemo(
    () => getRequestCalendarDates(request),
    [request],
  )
  const requestMonth = useMemo(() => getRequestCalendarMonth(dates), [dates])
  const [visibleMonth, setVisibleMonth] = useState(requestMonth)
  const monthDate = useMemo(() => toMonthStartDate(visibleMonth), [visibleMonth])

  const { events, status: bookingsStatus, retry: retryBookings } = useAdjacentMonthsEvents(visibleMonth)
  const eventsByDay = useMemo(() => groupEventsByDay(getBookedEvents(events)), [events])

  const hasRequestDate = dates.preferred !== null || dates.alternate !== null
  const canReturnToRequest = hasRequestDate && visibleMonth !== requestMonth

  const handleMonthChange = useCallback((nextMonthDate: Date) => {
    setVisibleMonth(getCurrentMonthParam(nextMonthDate))
  }, [])

  const DayButton = useCallback(
    (props: React.ComponentProps<typeof CalendarDayButton>) => {
      const { children, className, day, modifiers } = props
      const dayKey = getDayKey(day.date)
      const dayEvents = eventsByDay.get(dayKey) ?? []

      return (
        <MiniCalendarDayTooltip date={day.date} events={dayEvents} label={getRequestDayLabel(modifiers)}>
          <CalendarDayButton
            {...props}
            className={cn(
              className,
              "gap-0.5 pt-2",
              modifiers.alternate && ALTERNATE_DAY_CLASS,
              modifiers.preferred && PREFERRED_DAY_CLASS,
            )}
            data-mini-day={dayKey}
            data-request-day={modifiers.preferred ? "preferred" : modifiers.alternate ? "alternate" : undefined}
          >
            {children}
            <MiniCalendarDayMarkers events={dayEvents} />
          </CalendarDayButton>
        </MiniCalendarDayTooltip>
      )
    },
    [eventsByDay],
  )

  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-4" aria-busy={bookingsStatus === "loading"}>
      <Calendar
        month={monthDate}
        onMonthChange={handleMonthChange}
        onDayClick={ignoreDayClick}
        modifiers={{
          preferred: dates.preferred ?? [],
          alternate: dates.alternate ?? [],
        }}
        fixedWeeks
        showOutsideDays
        components={{ DayButton }}
        className="w-full bg-transparent p-0"
      />
      {bookingsStatus === "error" ? (
        <div
          role="alert"
          className="flex items-center justify-between gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive"
        >
          <span>Couldn&apos;t load bookings, so this calendar may be missing events.</span>
          <Button type="button" variant="outline" size="sm" className="h-6 shrink-0 px-2 text-xs" onClick={retryBookings}>
            Retry
          </Button>
        </div>
      ) : bookingsStatus === "loading" ? (
        <p role="status" className="text-xs text-muted-foreground">Checking bookings…</p>
      ) : null}
      <div className="flex min-h-6 items-center justify-between gap-2">
        {hasRequestDate ? (
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {dates.preferred ? <LegendItem swatchClassName={PREFERRED_DAY_CLASS} label="Preferred date" /> : null}
            {dates.alternate ? <LegendItem swatchClassName={ALTERNATE_DAY_CLASS} label="Alternate date" /> : null}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">The client didn&apos;t give a date.</p>
        )}
        {canReturnToRequest ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 shrink-0 px-2 text-xs text-orange-600 hover:bg-orange-50 hover:text-orange-700"
            onClick={() => setVisibleMonth(requestMonth)}
          >
            Back to requested date
          </Button>
        ) : null}
      </div>
    </section>
  )
}

export default RequestMiniCalendar
