/**
 * ViewToggle Component
 * 
 * A toggle switch for changing between calendar and list views.
 * Used in the Events page to switch between calendar and table display.
 * 
 * Features:
 * - Two toggle options: Calendar and List
 * - Visual indication of current selection
 * - Icons for each view mode
 * 
 * Location: src/features/calendar/navigation/ViewToggle.tsx
 */

import React from "react"
import { Calendar, List } from "lucide-react"

/** The available view modes for the events page */
export type ViewMode = "calendar" | "list"

interface ViewToggleProps {
  /** Current view mode */
  value: ViewMode
  /** Callback when view mode changes */
  onChange: (mode: ViewMode) => void
}

/**
 * ViewToggle
 * 
 * Toggle component for switching between calendar and list views.
 * Shows which view is currently active with primary color highlight.
 */
const ViewToggle: React.FC<ViewToggleProps> = ({ value, onChange }) => {
  return (
    /**
     * Toggle Container
     * - Horizontal flex layout with border
     * - Overflow hidden for rounded corners on buttons
     */
    <div className="flex overflow-hidden rounded-lg border border-white/20 bg-white/5">
      
      {/* Calendar View Button */}
      <button
        type="button"
        onClick={() => onChange("calendar")}
        className={`flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors ${
          value === "calendar" 
            ? "bg-white text-stone-900" 
            : "text-stone-300 hover:bg-white/10"
        }`}
      >
        <Calendar className="h-4 w-4" />
        Calendar
      </button>

      {/* List View Button */}
      <button
        type="button"
        onClick={() => onChange("list")}
        className={`flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors ${
          value === "list" 
            ? "bg-white text-stone-900" 
            : "text-stone-300 hover:bg-white/10"
        }`}
      >
        <List className="h-4 w-4" />
        List
      </button>
    </div>
  )
}

export default ViewToggle
