/**
 * CalendarGrid Component
 * 
 * Renders the main calendar grid showing days of the month with events.
 * Displays events as status cards within each day cell.
 * 
 * Features:
 * - Shows all days in the current month
 * - Highlights today's date
 * - Keeps week rows equal height across the calendar
 * - Displays as many events as fit per day (up to three full cards, or as many
 *   compact lines as the cell's height allows) with overflow in a popover
 * - Collapses events to compact lines when columns are narrow (whole grid)
 *   or a day's full cards don't fit (that week row only)
 * - Click events to navigate to event detail
 * 
 * Location: src/features/calendar/views/CalendarGrid.tsx
 */

import React, { useMemo, useRef } from "react"
import { useLocation, useNavigate } from "react-router"
import type { PrimaryClient } from "~/definitions/contacts"
import type { Event, EventStatus } from "~/definitions/database"
import type { CalendarDraftPreview } from "~/features/calendar/lib/calendarDraftPreview"
import { buildEventDetailEntryPath } from "~/features/event-detail/workspace/lib/eventDetailRouteState"
import CalendarDayEventList from "../components/CalendarDayEventList"
import { useCalendarDensity } from "../hooks/useCalendarDensity"
import { buildCardCountsByRow, sortEventsByCompactStatus } from "../lib/calendarDensity"

const MAX_VISIBLE_DAY_EVENTS = 3

/**
 * Events starting on a specific day, in start-time order
 */
const getEventsForDay = (events: Event[], year: number, month: number, day: number): Event[] => {
  return events
    .filter((event) => {
      if (!event.startDateTime) return false
      const eventDate = new Date(event.startDateTime)
      return (
        eventDate.getFullYear() === year &&
        eventDate.getMonth() === month &&
        eventDate.getDate() === day
      )
    })
    .sort((a, b) => {
      if (!a.startDateTime || !b.startDateTime) return 0
      return a.startDateTime.localeCompare(b.startDateTime)
    })
}

interface CalendarGridProps {
  /** Events to display on the calendar */
  events: Event[]
  /** Primary client per event id, from the contacts table */
  clientsByEventId?: Record<string, PrimaryClient>
  /** Current year being displayed */
  year: number
  /** Current month being displayed (0-11) */
  month: number
  /** Day of week the first of the month starts on (0=Sunday) */
  startingDay: number
  /** Number of days in the current month */
  daysInMonth: number
  /** Callback when a day cell is clicked */
  onDayCellClick?: (date: Date) => void
  /** Draft event preview shown while creating a new event */
  draftPreview?: CalendarDraftPreview | null
  /** Callback when editing a calendar event chip */
  onEventEdit?: (event: Event) => void
  /** Callback when deleting a calendar event chip */
  onEventDelete?: (eventId: string) => void
  /** Callback when changing status from a compact line's popover */
  onEventStatusChange?: (eventId: string, status: EventStatus) => void
}

/**
 * CalendarGrid
 * 
 * Renders the calendar grid with days and events.
 * Events are filtered to show only those in the current month.
 */
const CalendarGrid: React.FC<CalendarGridProps> = ({
  events,
  clientsByEventId,
  year,
  month,
  startingDay,
  daysInMonth,
  onDayCellClick,
  draftPreview,
  onEventEdit,
  onEventDelete,
  onEventStatusChange,
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = `${location.pathname}${location.search}`
  const totalCells = startingDay + daysInMonth
  const weekRows = Math.max(1, Math.ceil(totalCells / 7))
  const trailingEmptyCells = weekRows * 7 - totalCells
  const daysInPreviousMonth = new Date(year, month, 0).getDate()
  const leadingOutsideDays = Array.from({ length: startingDay }, (_, i) => {
    return daysInPreviousMonth - startingDay + i + 1
  })
  const trailingOutsideDays = Array.from(
    { length: trailingEmptyCells },
    (_, i) => i + 1,
  )

  const gridRef = useRef<HTMLDivElement>(null)
  const eventsByDay = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => getEventsForDay(events, year, month, i + 1)),
    [events, year, month, daysInMonth],
  )
  const cardCountsByRow = useMemo(
    () => buildCardCountsByRow(eventsByDay.map((dayEvents) => dayEvents.length), startingDay, MAX_VISIBLE_DAY_EVENTS),
    [eventsByDay, startingDay],
  )
  const density = useCalendarDensity(gridRef, `${year}-${month}`, cardCountsByRow)
  const isDayCompact = (day: number): boolean => {
    const row = Math.floor((startingDay + day - 1) / 7)
    return density.isNarrow || density.compactRows[row] === true
  }

  /**
   * Check if a day is today
   */
  const isToday = (day: number): boolean => {
    const today = new Date()
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day
    )
  }

  /**
   * Handle clicking on an event - navigate to event detail
   */
  const handleEventClick = (eventId: string) => {
    navigate(buildEventDetailEntryPath(eventId, returnTo))
  }

  const handleDayCellClick = (day: number) => {
    onDayCellClick?.(new Date(year, month, day))
  }

  const getDraftPreviewForDay = (day: number): CalendarDraftPreview | null => {
    if (!draftPreview || !draftPreview.startDateTime) return null

    const draftDate = new Date(draftPreview.startDateTime)
    if (Number.isNaN(draftDate.getTime())) return null

    if (
      draftDate.getFullYear() !== year ||
      draftDate.getMonth() !== month ||
      draftDate.getDate() !== day
    ) {
      return null
    }

    const title =
      draftPreview.title.trim().length === 0 ? "Untitled" : draftPreview.title
    return {
      ...draftPreview,
      title,
    }
  }

  return (
    /**
     * Calendar Grid Container
     * - 7-column grid for days of the week
     */
    <div
      ref={gridRef}
      className="grid h-[calc(100%-37px)] grid-cols-7"
      style={{ gridTemplateRows: `repeat(${weekRows}, minmax(0, 1fr))` }}
      data-testid="calendar-grid"
    >
      {/* Outside days from the previous month */}
      {leadingOutsideDays.map((day) => (
        <div
          key={`outside-prev-${day}`}
          className="min-h-0 overflow-hidden border-b border-r bg-stone-200/20 px-2 py-1"
          data-testid="calendar-grid-cell"
          data-cell-kind="outside-prev"
          data-outside-day={day}
        >
          <div
            className="mb-1 shrink-0 text-sm text-stone-400"
            data-outside-day-number
          >
            {day}
          </div>
        </div>
      ))}

      {/* Days of the month */}
      {Array.from({ length: daysInMonth }).map((_, i) => {
        const day = i + 1
        const compact = isDayCompact(day)
        const dayEvents = compact ? sortEventsByCompactStatus(eventsByDay[i]) : eventsByDay[i]
        const draftForDay = getDraftPreviewForDay(day)

        return (
          <div
            key={day}
            className={`relative min-h-0 overflow-hidden border-b border-r py-1 px-2 flex flex-col ${
              isToday(day) ? 'bg-orange-50/50' : ''
            }`}
            onClick={() => handleDayCellClick(day)}
            data-testid="calendar-grid-cell"
            data-cell-kind="day"
            data-day-of-month={day}
          >
            {/* Day number */}
            <div
              className={`text-sm mb-1 shrink-0 ${
              isToday(day) ? 'font-bold text-primary flex justify-center items-center text-white bg-orange-500 w-6 h-6 rounded-full m-1' : 'text-muted-foreground'
            }`}
              data-day-number
            >
              {day}
            </div>

            {/* Events for this day */}
            <div
              className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden"
              data-testid={`calendar-day-events-${day}`}
            >
              {draftForDay ? (
                <div
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
                  className="w-full shrink-0 truncate rounded border border-dashed border-stone-400 bg-stone-100/80 px-1 py-0.5 text-[10px] text-stone-600"
                  title={draftForDay.title}
                  data-testid={`calendar-draft-chip-${day}`}
                >
                  {draftForDay.title}
                </div>
              ) : null}
              <CalendarDayEventList
                day={day}
                events={dayEvents}
                maxVisible={MAX_VISIBLE_DAY_EVENTS}
                compact={compact}
                clientsByEventId={clientsByEventId}
                onEventClick={handleEventClick}
                onEventEdit={onEventEdit}
                onEventDelete={onEventDelete}
                onEventStatusChange={onEventStatusChange}
              />
            </div>
          </div>
        )
      })}

      {/* Outside days from the next month */}
      {trailingOutsideDays.map((day) => (
        <div
          key={`outside-next-${day}`}
          className="min-h-0 overflow-hidden border-b border-r bg-stone-200/20 p-1"
          data-testid="calendar-grid-cell"
          data-cell-kind="outside-next"
          data-outside-day={day}
        >
          <div
            className="mb-1 shrink-0 text-sm text-stone-400"
            data-outside-day-number
          >
            {day}
          </div>
        </div>
      ))}
    </div>
  )
}

export default CalendarGrid
