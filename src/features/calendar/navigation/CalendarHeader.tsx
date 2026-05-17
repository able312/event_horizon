/**
 * CalendarHeader Component
 * 
 * The header section of the calendar showing month navigation.
 * 
 * Features:
 * - Previous/Next month navigation buttons
 * - Current month and year display
 * - "Today" button to jump to current month
 * 
 * Location: src/features/calendar/navigation/CalendarHeader.tsx
 */

import React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface CalendarHeaderProps {
  /** Current year being displayed */
  year: number
  /** Current month being displayed (0-11) */
  month: number
  /** Callback to navigate to previous month */
  onPrevMonth: () => void
  /** Callback to navigate to next month */
  onNextMonth: () => void
  /** Callback to navigate to today */
  onGoToToday: () => void
}

/**
 * Names of months for display
 */
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

/**
 * CalendarHeader
 * 
 * Header with month navigation and today button.
 */
const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  year,
  month,
  onPrevMonth,
  onNextMonth,
  onGoToToday,
}) => {
  return (
    /**
     * Header Container
     * - Flex layout with navigation on left, today button on right
     */
    <div className="flex items-center justify-between p-4 border-b bg-stone-50">
      {/* Month Navigation */}
      <div className="flex items-center gap-2">
        <button 
          onClick={onPrevMonth} 
          className="p-1 hover:bg-stone-200 rounded"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button 
          onClick={onNextMonth} 
          className="p-1 hover:bg-stone-200 rounded"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-semibold ml-2">
          {MONTH_NAMES[month]} {year}
        </h2>
      </div>

      {/* Today Button */}
      <button 
        onClick={onGoToToday}
        className="px-3 py-1 text-sm border rounded hover:bg-stone-100"
      >
        Today
      </button>
    </div>
  )
}

export default CalendarHeader
