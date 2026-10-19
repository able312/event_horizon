import React, { useCallback, useMemo } from "react"

import { Calendar, CalendarDayButton } from "~/components/atoms/calendar"
import type { Event } from "~/definitions/database"
import MiniCalendarDayMarkers from "~/features/calendar/components/MiniCalendarDayMarkers"
import { getDayKey, groupEventsByDay } from "~/features/calendar/lib/miniCalendarDays"
import { useHotkey } from "~/lib/hotKeys"
import { getCurrentMonthParam, toMonthStartDate } from "~/lib/months"
import { cn } from "~/lib/utils"

interface SidebarMiniCalendarProps {
  month: string
  events: Event[]
  onBrowseMonthChange: (month: string) => void
  onSelectMonth: (month: string) => void
}

const SidebarMiniCalendar: React.FC<SidebarMiniCalendarProps> = ({
  month,
  events,
  onBrowseMonthChange,
  onSelectMonth,
}) => {
  const monthDate = useMemo(() => toMonthStartDate(month), [month])
  const eventsByDay = useMemo(() => groupEventsByDay(events), [events])

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
      const dayKey = getDayKey(day.date)
      const dayEvents = modifiers.outside ? [] : (eventsByDay.get(dayKey) ?? [])

      return (
        <CalendarDayButton
          {...props}
          className={cn(className, "gap-0.5 pt-2")}
          data-mini-day={dayKey}
          data-mini-outside={modifiers.outside ? "true" : "false"}
        >
          {children}
          <MiniCalendarDayMarkers events={dayEvents} />
        </CalendarDayButton>
      )
    },
    [eventsByDay],
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
