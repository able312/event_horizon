import React, { useCallback, useMemo } from "react"

import { Calendar, CalendarDayButton } from "~/components/ui/calendar"
import type { Event, EventType } from "~/definitions/database"
import { EVENT_TYPE_DOT_COLORS } from "~/definitions/events/ui"
import { useHotkey } from "~/lib/hotKeys"
import { getCurrentMonthParam, toMonthStartDate } from "~/lib/months"
import { cn } from "~/lib/utils"

interface SidebarMiniCalendarProps {
  month: string
  events: Event[]
  onBrowseMonthChange: (month: string) => void
  onSelectMonth: (month: string) => void
}

type EventTypeByDay = Map<number, EventType[]>
const DEFAULT_EVENT_TYPE_DOT_COLOR = "bg-stone-500"
const EVENT_TYPE_DOT_COLORS_BY_KEY: Partial<Record<string, string>> =
  EVENT_TYPE_DOT_COLORS

function getDayKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function buildEventTypesByDay(monthDate: Date, events: Event[]): EventTypeByDay {
  const dayToEventTypes: EventTypeByDay = new Map()
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()

  for (const event of events) {
    if (!event.startDateTime) continue

    const eventDate = new Date(event.startDateTime)
    if (Number.isNaN(eventDate.getTime())) continue

    const isInMonth =
      eventDate.getFullYear() === year &&
      eventDate.getMonth() === month

    if (!isInMonth) continue

    const day = eventDate.getDate()
    const eventTypes = dayToEventTypes.get(day) ?? []
    dayToEventTypes.set(day, [...eventTypes, event.type])
  }

  return dayToEventTypes
}

function getDotColorClass(eventType: string): string {
  return EVENT_TYPE_DOT_COLORS_BY_KEY[eventType] ?? DEFAULT_EVENT_TYPE_DOT_COLOR
}

const SidebarMiniCalendar: React.FC<SidebarMiniCalendarProps> = ({
  month,
  events,
  onBrowseMonthChange,
  onSelectMonth,
}) => {
  const monthDate = useMemo(() => toMonthStartDate(month), [month])
  const eventTypesByDay = useMemo(
    () => buildEventTypesByDay(monthDate, events),
    [events, monthDate],
  )

  const handleMonthChange = useCallback(
    (nextMonthDate: Date) => {
      onBrowseMonthChange(getCurrentMonthParam(nextMonthDate))
    },
    [onBrowseMonthChange],
  )

  const handleDayClick = useCallback(
    (day: Date) => {
      onSelectMonth(getCurrentMonthParam(day))
    },
    [onSelectMonth],
  )

  // HOT KEYS
  useHotkey("a", () => {
    const prev = new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1)
    onBrowseMonthChange(getCurrentMonthParam(prev))
  })
  useHotkey("d", () => {
    const next = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1)
    onBrowseMonthChange(getCurrentMonthParam(next))
  })
  useHotkey("space", () => {
    console.log("FIRE")
    onSelectMonth(month)
  })
  

  const DayButton = useCallback(
    (props: React.ComponentProps<typeof CalendarDayButton>) => {
      const { children, className, day, modifiers } = props
      const dayEventTypes = modifiers.outside
        ? []
        : (eventTypesByDay.get(day.date.getDate()) ?? [])

      const markerContent =
        dayEventTypes.length === 0 ? null : dayEventTypes.length > 2 ? (
          <span
            data-mini-marker="count"
            className="inline-flex min-w-4 items-center justify-center rounded-full bg-stone-600 px-1 py-0.5 text-[9px] font-medium text-white"
          >
            {dayEventTypes.length}
          </span>
        ) : (
          <span
            data-mini-marker={dayEventTypes.length === 2 ? "dots" : "dot"}
            className="inline-flex items-center justify-center gap-1 pt-1"
          >
            {dayEventTypes.map((eventType, index) => (
              <span
                key={`${day.date.toISOString()}-${eventType}-${index}`}
                data-mini-marker-dot={eventType}
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  getDotColorClass(eventType),
                )}
              />
            ))}
          </span>
        )

      return (
        <CalendarDayButton
          {...props}
          className={cn(className, "gap-0.5 pt-2")}
          data-mini-day={getDayKey(day.date)}
          data-mini-outside={modifiers.outside ? "true" : "false"}
        >
          {children}
          {markerContent}
        </CalendarDayButton>
      )
    },
    [eventTypesByDay],
  )

  return (
    <Calendar
      mode="single"
      month={monthDate}
      onMonthChange={handleMonthChange}
      onDayClick={handleDayClick}
      fixedWeeks
      showOutsideDays
      components={{ DayButton }}
      className="w-full bg-white/5 border-b-0.5 border-stone-50"
    />
  )
}

export default SidebarMiniCalendar
