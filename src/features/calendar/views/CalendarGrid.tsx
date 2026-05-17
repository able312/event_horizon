/**
 * CalendarGrid Component
 * 
 * Renders the main calendar grid showing days of the month with events.
 * Displays events as colored chips within each day cell.
 * 
 * Features:
 * - Shows all days in the current month
 * - Highlights today's date
 * - Keeps week rows equal height across the calendar
 * - Displays up to three events per day with overflow in a popover
 * - Click events to navigate to event detail
 * 
 * Location: src/features/calendar/views/CalendarGrid.tsx
 */

import React from "react"
import { useLocation, useNavigate } from "react-router"
import { AlertTriangle } from "lucide-react"
import { EVENT_TYPE_COLORS } from "~/definitions/events/ui"
import type { Event } from "~/definitions/database"
import type { CalendarDraftPreview } from "~/features/calendar/lib/calendarDraftPreview"
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover"
import EventItemContextMenu from "../interactions/EventItemContextMenu"

const MAX_VISIBLE_DAY_EVENTS = 3

interface CalendarGridProps {
  /** Events to display on the calendar */
  events: Event[]
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
}

/**
 * CalendarGrid
 * 
 * Renders the calendar grid with days and events.
 * Events are filtered to show only those in the current month.
 */
const CalendarGrid: React.FC<CalendarGridProps> = ({
  events,
  year,
  month,
  startingDay,
  daysInMonth,
  onDayCellClick,
  draftPreview,
  onEventEdit,
  onEventDelete,
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

  /**
   * Filter events for a specific day
   */
  const getEventsForDay = (day: number): Event[] => {
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
    navigate(`/events/${eventId}`, { state: { returnTo } })
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

  const needsGoogleCalendarWarning = (event: Event): boolean => {
    return !event.calendarId || event.calendarId.trim().length === 0
  }

  return (
    /**
     * Calendar Grid Container
     * - 7-column grid for days of the week
     */
    <div
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
        const dayEvents = getEventsForDay(day)
        const visibleDayEvents = dayEvents.slice(0, MAX_VISIBLE_DAY_EVENTS)
        const hiddenDayEventsCount = Math.max(0, dayEvents.length - MAX_VISIBLE_DAY_EVENTS)
        const draftForDay = getDraftPreviewForDay(day)

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
              className="min-h-0 flex-1 space-y-1 overflow-hidden"
              data-testid={`calendar-day-events-${day}`}
            >
              {draftForDay ? (
                <div
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
                  className="w-full truncate rounded border border-dashed border-stone-400 bg-stone-100/80 px-1 py-0.5 text-[10px] text-stone-600"
                  title={draftForDay.title}
                  data-testid={`calendar-draft-chip-${day}`}
                >
                  {draftForDay.title}
                </div>
              ) : null}
              {visibleDayEvents.map(event => (
                <EventItemContextMenu
                  key={event.id}
                  event={event}
                  onEdit={onEventEdit}
                  onDelete={onEventDelete}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEventClick(event.id)
                    }}
                    className={`w-full text-left px-1 py-0.5 rounded text-[10px] truncate hover:opacity-80 ${
                      EVENT_TYPE_COLORS[event.type as keyof typeof EVENT_TYPE_COLORS] || 'bg-stone-100'
                    }`}
                    title={event.title}
                  >
                    <div className="flex items-center gap-1">
                      <span className="truncate">{event.title}</span>
                      {needsGoogleCalendarWarning(event) ? (
                        <span
                          title="Not uploaded to Google Calendar."
                          aria-label="Not uploaded to Google Calendar."
                          className="inline-flex"
                        >
                          <AlertTriangle
                            className="h-3 w-3 shrink-0 text-yellow-600"
                            aria-hidden="true"
                          />
                        </span>
                      ) : null}
                    </div>
                    <p>{event.clientName}</p>
                    <p>{!event.guestCountFinal ? event.minGuests + " - " : "" }{event.maxGuests} guests</p>
                    <p>{event.status}</p>
                  </button>
                </EventItemContextMenu>
              ))}
              {hiddenDayEventsCount > 0 ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                      }}
                      className="w-full rounded border border-dashed border-stone-300 px-1 py-0.5 text-left text-[10px] text-muted-foreground hover:bg-stone-50"
                      aria-label={`+${hiddenDayEventsCount} more events`}
                    >
                      +{hiddenDayEventsCount} more
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-72 p-2"
                    align="start"
                    onClick={(e) => {
                      e.stopPropagation()
                    }}
                  >
                    <div className="max-h-64 space-y-1 overflow-y-auto">
                      {dayEvents.map((event) => (
                        <EventItemContextMenu
                          key={`more-${day}-${event.id}`}
                          event={event}
                          onEdit={onEventEdit}
                          onDelete={onEventDelete}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEventClick(event.id)
                            }}
                            className={`w-full rounded px-2 py-1 text-left text-xs hover:opacity-80 ${
                              EVENT_TYPE_COLORS[event.type as keyof typeof EVENT_TYPE_COLORS] || "bg-stone-100"
                            }`}
                            title={event.title}
                          >
                            <span className="flex items-center gap-1">
                              <span className="truncate">{event.title}</span>
                              {needsGoogleCalendarWarning(event) ? (
                                <span
                                  title="Not uploaded to Google Calendar."
                                  aria-label="Not uploaded to Google Calendar."
                                  className="inline-flex"
                                >
                                  <AlertTriangle
                                    className="h-3.5 w-3.5 shrink-0 text-yellow-600"
                                    aria-hidden="true"
                                  />
                                </span>
                              ) : null}
                            </span>
                          </button>
                        </EventItemContextMenu>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              ) : null}
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
