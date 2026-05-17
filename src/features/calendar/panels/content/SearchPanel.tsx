/**
 * EventsFilters Component
 * 
 * Filter controls for the Events page.
 * Contains search input and type/status filter dropdowns.
 * 
 * Features:
 * - Search input with icon
 * - Event type filter dropdown
 * - Event status filter dropdown
 * 
 * Location: src/features/calendar/panels/content/SearchPanel.tsx
 */

import React, { useRef, useEffect } from "react"
import { Search } from "lucide-react"
import { ITER_EVENT_STATUSES } from "~/definitions/events/event-constants"
import { EVENT_TYPE_LABELS, EVENT_STATUS_LABELS, EVENT_TYPE_OPTIONS } from "~/definitions/events/ui"
import type { EventStatus, EventType } from "~/definitions/database"

interface EventsFiltersProps {
  /** Current search term */
  searchTerm: string
  /** Callback when search term changes */
  onSearchChange: (term: string) => void
  /** Current type filter value */
  filterType: EventType | null
  /** Callback when type filter changes */
  onFilterTypeChange: (type: EventType | null) => void
  /** Current status filter value */
  filterStatus: EventStatus | null
  /** Callback when status filter changes */
  onFilterStatusChange: (status: EventStatus | null) => void
  /** Optional ref to focus the search input externally */
  searchInputRef?: React.RefObject<HTMLInputElement | null>
  dateRange: {
    dateFrom: string
    dateTo: string
  }
  onDateRangeChange: (next: { dateFrom: string; dateTo: string }) => void
}

/**
 * EventsFilters
 * 
 * Filter bar with search and dropdown filters.
 */
const SearchPanel: React.FC<EventsFiltersProps> = ({
  searchTerm,
  onSearchChange,
  filterType,
  onFilterTypeChange,
  filterStatus,
  onFilterStatusChange,
  dateRange,
  onDateRangeChange,
}) => {

  const searchInputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (searchInputRef.current) searchInputRef.current.focus()
  }, [])

  return (
    /**
     * Filters Container
     * - Flex layout with gap
     * - Search takes remaining space
     */
    <div className="mb-6 p-4 flex w-full flex-col gap-4">
      
      {/* Search Input */}
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search events..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-lg border border-white/15 bg-white/5 py-2 pr-4 pl-10 text-stone-100 placeholder:text-stone-400 focus:border-white/30 focus:outline-none"
        />
      </div>

      {/* Type Filter Dropdown */}
      <select
        value={filterType ?? "all"}
        onChange={(e) =>
          onFilterTypeChange(
            e.target.value === "all" ? null : (e.target.value as EventType),
          )
        }
        className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-stone-100 focus:border-white/30 focus:outline-none"
      >
        <option value="all">All Types</option>
        {EVENT_TYPE_OPTIONS.map(type => (
          <option key={type} value={type}>{EVENT_TYPE_LABELS[type]}</option>
        ))}
      </select>

      {/* Status Filter Dropdown */}
      <select
        value={filterStatus ?? "all"}
        onChange={(e) =>
          onFilterStatusChange(
            e.target.value === "all" ? null : (e.target.value as EventStatus),
          )
        }
        className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-stone-100 focus:border-white/30 focus:outline-none"
      >
        <option value="all">All Statuses</option>
        {ITER_EVENT_STATUSES.map(status => (
          <option key={status} value={status}>{EVENT_STATUS_LABELS[status]}</option>
        ))}
      </select>

      <div className="grid grid-cols-2 gap-3">
        <input
          type="date"
          value={dateRange.dateFrom}
          onChange={(e) =>
            onDateRangeChange({
              dateFrom: e.target.value,
              dateTo: dateRange.dateTo,
            })
          }
          className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-stone-100 focus:border-white/30 focus:outline-none"
        />
        <input
          type="date"
          value={dateRange.dateTo}
          onChange={(e) =>
            onDateRangeChange({
              dateFrom: dateRange.dateFrom,
              dateTo: e.target.value,
            })
          }
          className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-stone-100 focus:border-white/30 focus:outline-none"
        />
      </div>
    </div>
  )
}

export default SearchPanel
