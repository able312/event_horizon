/**
 * EventsTable Component
 * 
 * A table displaying a list of events with key information.
 * 
 * Features:
 * - Columns: Event, Type, Date, Client, Guests, Status, Value, Actions
 * - Clickable event titles that link to detail page
 * - Color-coded type and status badges
 * - Empty state when no events exist
 * - Hover effects on rows
 * - Kebab menu with Edit and Delete actions
 * 
 * Location: src/features/calendar/views/EventsTable.tsx
 */

import React from "react"
import { Link, useLocation } from "react-router"
import { EVENT_TYPE_LABELS, EVENT_TYPE_COLORS, EVENT_STATUS_LABELS, EVENT_STATUS_COLORS } from "~/definitions/events/ui"
import { formatDate } from "~/lib/formatters"
import { EntityKebabMenu } from "~/components/atoms/entity-kebab-menu"
import type { Event } from "~/definitions/database"
import { buildEventDetailEntryPath } from "~/features/event-detail/workspace/lib/eventDetailRouteState"

interface EventsTableProps {
  /** Array of events to display */
  events: Event[]
  /** Loading state for rendering a neutral empty row while month data is fetching */
  isLoading?: boolean
  /** Callback when Edit is clicked */
  onEdit?: (event: Event) => void
  /** Callback when Delete is clicked */
  onDelete?: (eventId: string) => void
}

/**
 * EventsTable
 * 
 * Table component for displaying event list.
 */
const EventsTable: React.FC<EventsTableProps> = ({
  events,
  isLoading = false,
  onEdit,
  onDelete,
}) => {
  const location = useLocation()
  const returnTo = `${location.pathname}${location.search}`

  return (
    /**
     * Table Container
     * - White background with border
     * - Horizontal scroll if needed
     */
    <div className="">
      <table className="w-full">
        
        {/* Table Header */}
        <thead className="bg-stone-50/20 rounded-lg border-b">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Event</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Client</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Guests</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>

        {/* Table Body */}
        <tbody className="overflow-scroll">
          {/* Empty State */}
          {events.length === 0 ? (
            <tr>
              {isLoading ? (
                <td colSpan={8} className="px-4 py-8" />
              ) : (
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  No events found. Create your first event to get started.
                </td>
              )}
            </tr>
          ) : (
            /* Event Rows */
            events.map(event => (
              <EventTableRow 
                key={event.id} 
                event={event} 
                onEdit={onEdit}
                onDelete={onDelete}
                returnTo={returnTo}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

/**
 * EventTableRow Component
 * 
 * Individual row for a single event.
 * Extracted for cleaner table code.
 */
interface EventTableRowProps {
  event: Event
  onEdit?: (event: Event) => void
  onDelete?: (eventId: string) => void
  returnTo: string
}

const EventTableRow: React.FC<EventTableRowProps> = ({
  event,
  onEdit,
  onDelete,
  returnTo,
}) => {
  return (
    <tr key={event.id} className="border-b hover:bg-stone-50">
      {/* Event Title - Clickable link to detail page */}
      <td className="px-4 py-3">
        <Link
          to={buildEventDetailEntryPath(event.id, returnTo)}
          className="font-medium text-primary hover:underline"
        >
          {event.title}
        </Link>
      </td>

      {/* Event Type Badge */}
      <td className="px-4 py-3">
        <span className={`px-2 py-1 rounded text-sm ${EVENT_TYPE_COLORS[event.type] || "bg-stone-100"}`}>
          {EVENT_TYPE_LABELS[event.type] || event.type}
        </span>
      </td>

      {/* Event Date */}
      <td className="px-4 py-3 text-sm">{formatDate(event.startDateTime)}</td>

      {/* Client Name */}
      <td className="px-4 py-3 text-sm">{event.clientName || "-"}</td>

      {/* Guest Count */}
      <td className="px-4 py-3 text-sm">
        {event.minGuests && event.maxGuests
          ? `${event.minGuests} - ${event.maxGuests}`
          : event.maxGuests || "-"}
      </td>

      {/* Status Badge */}
      <td className="px-4 py-3">
        <span className={`px-2 py-1 rounded text-xs ${EVENT_STATUS_COLORS[event.status] || "bg-gray-100"}`}>
          {EVENT_STATUS_LABELS[event.status] || event.status}
        </span>
      </td>

      {/* Actions - Kebab Menu with Edit and Delete */}
      <td className="px-4 py-3">
        <EntityKebabMenu 
          variant="ghost"
          onEdit={() => onEdit?.(event)}
          onDelete={() => onDelete?.(event.id)}
        />
      </td>
    </tr>
  )
}

export default EventsTable
