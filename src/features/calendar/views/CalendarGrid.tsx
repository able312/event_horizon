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
 * - Keeps at most one event popover open; a click that closes one doesn't
 *   also open the day
 * - Flags shared holidays with a marker beside the day number (names on
 *   hover/focus); holidays are never events and never open the day
 * 
 * Location: src/features/calendar/views/CalendarGrid.tsx
 */

import React, { useMemo, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router"
import type { PrimaryClient } from "~/definitions/contacts"
import type { Event, EventStatus } from "~/definitions/database"
import type { HolidayEntry } from "~/definitions/holidays"
import type { CalendarDraftPreview } from "~/features/calendar/lib/calendarDraftPreview"
import { buildEventDetailEntryPath } from "~/features/event-detail/workspace/lib/eventDetailRouteState"
import CalendarDayEventList from "../components/CalendarDayEventList"
import CalendarHolidayMarker from "../components/CalendarHolidayMarker"
import { useCalendarDensity } from "../hooks/useCalendarDensity"
import {
  buildDayHeightsByRow,
  DRAFT_CHIP_RESERVED_HEIGHT,
  sortEventsByCompactStatus,
  TODAY_MARKER_EXTRA_HEIGHT,
} from "../lib/calendarDensity"
import { getHolidayTitlesByDay } from "../lib/calendarHolidays"

const MAX_VISIBLE_DAY_EVENTS = 3

/**
 * Day of the month the draft starts on, or null when it isn't in this month
 */
const getDraftDay = (draftPreview: CalendarDraftPreview | null | undefined, year: number, month: number): number | null => {
  if (!draftPreview?.startDateTime) return null
  const draftDate = new Date(draftPreview.startDateTime)
  if (Number.isNaN(draftDate.getTime())) return null
  if (draftDate.getFullYear() !== year || draftDate.getMonth() !== month) return null
  return draftDate.getDate()
}

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
  /** Shared holidays touching this month; read-only, shown beside the day number */
  holidays?: HolidayEntry[]
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
  holidays,
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
  // Scoped to the month so a popover left open doesn't carry over (day keys repeat)
  const monthKey = `${year}-${month}`
  const [openPopover, setOpenPopover] = useState<{ monthKey: string; key: string } | null>(null)
  if (openPopover !== null && openPopover.monthKey !== monthKey) {
    // Forget it rather than just hiding it, or coming back to the month reopens it.
    setOpenPopover(null)
  }
  const openPopoverKey = openPopover?.monthKey === monthKey ? openPopover.key : null
  // Set on pointerdown when a popover is open, so that click only dismisses it
  const skipNextDayClickRef = useRef(false)
  const eventsByDay = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => getEventsForDay(events, year, month, i + 1)),
    [events, year, month, daysInMonth],
  )
  const holidayTitlesByDay = useMemo(
    () => getHolidayTitlesByDay(holidays ?? [], year, month, daysInMonth),
    [holidays, year, month, daysInMonth],
  )
  const draftDay = getDraftDay(draftPreview, year, month)
  const now = new Date()
  const todayDay = now.getFullYear() === year && now.getMonth() === month ? now.getDate() : null
  const dayHeightsByRow = useMemo(
    () =>
      buildDayHeightsByRow(
        eventsByDay.map((dayEvents, i) => ({
          eventCount: dayEvents.length,
          reservedHeight:
            (i + 1 === draftDay ? DRAFT_CHIP_RESERVED_HEIGHT : 0) +
            (i + 1 === todayDay ? TODAY_MARKER_EXTRA_HEIGHT : 0),
        })),
        startingDay,
        MAX_VISIBLE_DAY_EVENTS,
      ),
    [eventsByDay, startingDay, draftDay, todayDay],
  )
  const density = useCalendarDensity(gridRef, monthKey, dayHeightsByRow)
  const isDayCompact = (day: number): boolean => {
    const row = Math.floor((startingDay + day - 1) / 7)
    return density.isNarrow || density.compactRows[row] === true
  }

  /**
   * Check if a day is today
   */
  const isToday = (day: number): boolean => day === todayDay

  /**
   * Handle clicking on an event - navigate to event detail
   */
  const handleEventClick = (eventId: string) => {
    // Cards stop click propagation, which stops Radix dismissing on its own.
    setOpenPopover(null)
    navigate(buildEventDetailEntryPath(eventId, returnTo))
  }

  const handleDayCellClick = (day: number) => {
    if (skipNextDayClickRef.current) {
      skipNextDayClickRef.current = false
      return
    }
    onDayCellClick?.(new Date(year, month, day))
  }

  const handlePopoverOpenChange = (key: string, open: boolean) => {
    setOpenPopover((current) => {
      if (open) return { monthKey, key }
      // A closing popover mustn't clear one that has just replaced it.
      return current?.monthKey === monthKey && current.key === key ? null : current
    })
  }

  const getDraftPreviewForDay = (day: number): CalendarDraftPreview | null => {
    if (!draftPreview || day !== draftDay) return null

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
      // Radix only dismisses after the click has reached the day cell, so remember
      // here that this press is closing a popover.
      onPointerDownCapture={() => {
        skipNextDayClickRef.current = openPopoverKey !== null
      }}
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
        const holidayTitles = holidayTitlesByDay.get(day)

        return (
          <div
            key={day}
            className={`min-h-0 overflow-hidden border-b border-r py-1 px-2 flex flex-col ${
              isToday(day) ? 'bg-orange-50/50' : ''
            }`}
            onClick={() => handleDayCellClick(day)}
            data-testid="calendar-grid-cell"
            data-cell-kind="day"
            data-day-of-month={day}
          >
            <CalendarDayEventList
              day={day}
              header={
                <>
                  <div
                    className={`shrink-0 text-sm ${
                      isToday(day)
                        ? 'mx-1 my-0.5 flex size-6 items-center justify-center rounded-full bg-orange-500 font-bold text-white'
                        : 'leading-5 text-muted-foreground'
                    }`}
                    data-day-number
                  >
                    {day}
                  </div>
                  {holidayTitles ? (
                    // Keyed by month so an open tooltip doesn't carry over to the same day of another month
                    <CalendarHolidayMarker
                      key={monthKey}
                      titles={holidayTitles}
                      suppressed={openPopoverKey !== null}
                      onClickOpen={() => setOpenPopover(null)}
                    />
                  ) : null}
                </>
              }
              leadingItem={
                draftForDay ? (
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
                ) : null
              }
              events={dayEvents}
              maxVisible={MAX_VISIBLE_DAY_EVENTS}
              compact={compact}
              clientsByEventId={clientsByEventId}
              openPopoverKey={openPopoverKey}
              onPopoverOpenChange={handlePopoverOpenChange}
              onEventClick={handleEventClick}
              onEventEdit={onEventEdit}
              onEventDelete={onEventDelete}
              onEventStatusChange={onEventStatusChange}
            />
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
