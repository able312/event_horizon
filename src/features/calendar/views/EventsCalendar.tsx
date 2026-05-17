/**
 * EventsCalendar Component
 * 
 * A calendar view displaying events organized by date.
 * Shows a monthly calendar grid with events on their respective days,
 * plus an "Unscheduled Events" section for events without dates.
 * 
 * Features:
 * - Monthly calendar grid with navigation
 * - Events displayed as colored chips on calendar days
 * - Unscheduled events section for events without dates
 * - Click events to navigate to detail page
 * 
 * Location: src/features/calendar/views/EventsCalendar.tsx
 */

import React, { useCallback, useMemo, useRef } from "react"
import type { Event } from "~/definitions/database"
import type { CalendarDraftPreview } from "~/features/calendar/lib/calendarDraftPreview"
import { shiftMonthParam, toMonthStartDate } from "~/lib/months"

// Extracted sub-components
import CalendarGrid from "~/features/calendar/views/CalendarGrid"

interface EventsCalendarProps {
  events: Event[]
  date: string
  onDateChange: (date: string) => void
  onDayCellClick?: (date: Date) => void
  draftPreview?: CalendarDraftPreview | null
  onEventEdit?: (event: Event) => void
  onEventDelete?: (eventId: string) => void
}

/**
 * Day names for calendar header
 */
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const WHEEL_SNAP_THRESHOLD = 80
const WHEEL_SNAP_COOLDOWN_MS = 300

/**
 * EventsCalendar
 * 
 * Main calendar component that displays events on a monthly grid.
 */
const EventsCalendar: React.FC<EventsCalendarProps> = ({
  events,
  date,
  onDateChange,
  onDayCellClick,
  draftPreview,
  onEventEdit,
  onEventDelete,
}) => {
  const wheelDeltaAccumulatorRef = useRef(0)
  const wheelDirectionRef = useRef<1 | -1 | 0>(0)
  const lastSnapAtRef = useRef(0)
  const currentDate = useMemo(() => toMonthStartDate(date), [date])
  // Derived date values
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Calculate calendar data
  const firstDayOfMonth = useMemo(
    () => new Date(year, month, 1),
    [year, month]
  )
  const lastDayOfMonth = useMemo(
    () => new Date(year, month + 1, 0),
    [year, month]
  )
  const startingDay = firstDayOfMonth.getDay()
  const daysInMonth = lastDayOfMonth.getDate()

  const handleGridWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (event.deltaY === 0) return

      event.preventDefault()

      const now = Date.now()
      if (now - lastSnapAtRef.current < WHEEL_SNAP_COOLDOWN_MS) {
        return
      }

      const currentDirection: 1 | -1 = event.deltaY > 0 ? 1 : -1
      if (
        wheelDirectionRef.current !== 0 &&
        wheelDirectionRef.current !== currentDirection
      ) {
        wheelDeltaAccumulatorRef.current = 0
      }
      wheelDirectionRef.current = currentDirection
      wheelDeltaAccumulatorRef.current += event.deltaY

      if (Math.abs(wheelDeltaAccumulatorRef.current) < WHEEL_SNAP_THRESHOLD) {
        return
      }

      onDateChange(shiftMonthParam(date, currentDirection))
      lastSnapAtRef.current = now
      wheelDeltaAccumulatorRef.current = 0
      wheelDirectionRef.current = 0
    },
    [date, onDateChange],
  )

  return (
    /**
     * Main Container
     * - Calendar section with grid
     * - Unscheduled events section below
     */
    <div className="space-y-4 h-full min-h-0">
      
      {/* Calendar Card */}
      <div className="overflow-scroll h-full min-h-0" onWheel={handleGridWheel}>

        {/* Day Names Header */}
        <div className="grid grid-cols-7 border-b">
          {DAY_NAMES.map(day => (
            <div 
              key={day} 
              className="p-2 text-center text-sm font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid with Events */}
        <CalendarGrid
          events={events}
          year={year}
          month={month}
          startingDay={startingDay}
          daysInMonth={daysInMonth}
          onDayCellClick={onDayCellClick}
          draftPreview={draftPreview}
          onEventEdit={onEventEdit}
          onEventDelete={onEventDelete}
        />
      </div>
    </div>
  )
}

export default EventsCalendar
