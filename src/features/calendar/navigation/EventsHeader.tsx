/**
 * EventsHeader Component
 * 
 * The header section of the Events page.
 * Displays the page title, description, and "New Event" button.
 * 
 * Features:
 * - Calendar icon
 * - Page title: "Events"
 * - Subtitle/description
 * - "New Event" button with plus icon
 * 
 * Location: src/features/calendar/navigation/EventsHeader.tsx
 */

import React from "react"
import { Calendar, Plus } from "lucide-react"
import getGlassUI from "~/styles/GlassStyles"

interface EventsHeaderProps {
  /** Callback when "New Event" button is clicked */
  onNewEvent: () => void
}

/**
 * EventsHeader
 * 
 * Page header with title and action button.
 */
const EventsHeader: React.FC<EventsHeaderProps> = ({ onNewEvent }) => {
  return (
    /**
     * Header Container
     * - Glass-style background
     * - Flex layout for title and button
     */
    <div className={`${getGlassUI("white")} px-6 py-4 mb-6`}>
      <div className="flex items-center justify-between">
        
        {/* Title Section - Icon + Text */}
        <div className="flex items-center gap-3">
          <Calendar className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-slate-700">Events</h1>
            <p className="text-muted-foreground">Manage your tournaments, weddings, and functions</p>
          </div>
        </div>

        {/* New Event Button */}
        <button
          onClick={onNewEvent}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Event
        </button>
      </div>
    </div>
  )
}

export default EventsHeader
