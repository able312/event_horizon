/**
 * UnscheduledEvents Component
 * 
 * Displays a list of events that have no start date/time assigned.
 * Shown below the calendar grid.
 * 
 * Features:
 * - Lists all events without dates
 * - Shows event type badge, title, and client name
 * - Click to navigate to event detail
 * 
 * Location: src/features/calendar/views/UnscheduledEvents.tsx
 */

import React from "react"
import { useLocation, useNavigate } from "react-router"
import { EVENT_TYPE_COLORS } from "~/definitions/events/ui"
import type { Event } from "~/definitions/database"
import EventItemContextMenu from "../interactions/EventItemContextMenu"

interface UnscheduledEventsProps {
  /** Events to display (filtered to those without dates) */
  events: Event[]
  /** Callback when editing an event */
  onEventEdit?: (event: Event) => void
  /** Callback when deleting an event */
  onEventDelete?: (eventId: string) => void
}

/**
 * UnscheduledEvents
 * 
 * Shows events that haven't been scheduled yet.
 */
const UnscheduledEvents: React.FC<UnscheduledEventsProps> = ({
  events,
  onEventEdit,
  onEventDelete,
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = `${location.pathname}${location.search}`

  /**
   * Handle clicking on an event - navigate to event detail
   */
  const handleEventClick = (eventId: string) => {
    navigate(`/events/${eventId}`, { state: { returnTo } })
  }

  // Don't render if there are no unscheduled events
  if (events.length === 0) return null

  return (
    /**
     * Container
     * - White background with border
     * - List of clickable event items
     */
    <div className="bg-white rounded-lg border p-4">
      <h3 className="font-medium mb-3">Unscheduled Events</h3>
      <div className="space-y-2">
        {events.map(event => (
          <EventItemContextMenu
            key={event.id}
            event={event}
            onEdit={onEventEdit}
            onDelete={onEventDelete}
          >
            <button
              onClick={() => handleEventClick(event.id)}
              className="w-full text-left p-2 rounded border hover:bg-stone-50 flex items-center gap-2"
            >
              {/* Event Type Badge */}
              <span className={`px-2 py-0.5 rounded text-xs ${
                EVENT_TYPE_COLORS[event.type as keyof typeof EVENT_TYPE_COLORS]
              }`}>
                {event.type}
              </span>

              {/* Event Title */}
              <span className="font-medium">{event.title}</span>

              {/* Client Name (if present) */}
              {event.clientName && (
                <span className="text-sm text-muted-foreground">
                  - {event.clientName}
                </span>
              )}
            </button>
          </EventItemContextMenu>
        ))}
      </div>
    </div>
  )
}

export default UnscheduledEvents
