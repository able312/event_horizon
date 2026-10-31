/**
 * SearchPanel Component
 *
 * Sidebar search and filter controls for the calendar workspace.
 * Shares field styling with the create/edit event forms so the sidebar
 * reads as one surface.
 *
 * Features:
 * - Search input with icon
 * - Event type and status filter dropdowns
 * - Start date range using the shared DatePicker
 * - Clear filters action when any filter is set
 *
 * Location: src/features/calendar/panels/content/SearchPanel.tsx
 */

import React, { useEffect, useId, useRef } from "react"
import { Search } from "lucide-react"
import { DatePicker } from "~/components/atoms/date-picker"
import { ITER_EVENT_STATUSES } from "~/definitions/events/event-constants"
import { EVENT_TYPE_LABELS, EVENT_STATUS_LABELS, EVENT_TYPE_OPTIONS } from "~/definitions/events/ui"
import type { EventStatus, EventType } from "~/definitions/database"
import { parseLocalDateKey, toLocalDateKey } from "~/lib/months"
import { cn } from "~/lib/utils"
import {
  formDateFieldClasses,
  formFieldClasses,
  formLabelClasses,
  formOptionClasses,
} from "~/features/calendar/forms/eventFormStyles"

interface SearchPanelProps {
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
  /** Local `YYYY-MM-DD` keys; empty strings mean unbounded */
  dateRange: {
    dateFrom: string
    dateTo: string
  }
  onDateRangeChange: (next: { dateFrom: string; dateTo: string }) => void
  /** Resets search, type, status and dates in one update */
  onClearFilters: () => void
}

const ALL_OPTION = "all"

const SearchPanel: React.FC<SearchPanelProps> = ({
  searchTerm,
  onSearchChange,
  filterType,
  onFilterTypeChange,
  filterStatus,
  onFilterStatusChange,
  dateRange,
  onDateRangeChange,
  onClearFilters,
}) => {
  const fieldId = useId()
  const searchInputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    searchInputRef.current?.focus()
  }, [])

  const dateFrom = parseLocalDateKey(dateRange.dateFrom)
  const dateTo = parseLocalDateKey(dateRange.dateTo)
  const hasActiveFilters =
    searchTerm !== "" ||
    filterType !== null ||
    filterStatus !== null ||
    dateRange.dateFrom !== "" ||
    dateRange.dateTo !== ""

  const clearFilters = () => {
    onClearFilters()
    searchInputRef.current?.focus()
  }

  return (
    <div className="space-y-6 p-4">
      <div>
        <h2 className="text-lg font-semibold text-stone-100">Search Events</h2>
        <p className="mt-1 text-sm text-stone-300">Find events by name, type, status or date.</p>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            ref={searchInputRef}
            type="text"
            aria-label="Search events"
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className={cn(formFieldClasses, "pl-10")}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor={`${fieldId}-type`} className={formLabelClasses}>Type</label>
            <select
              id={`${fieldId}-type`}
              value={filterType ?? ALL_OPTION}
              onChange={(e) =>
                onFilterTypeChange(
                  e.target.value === ALL_OPTION ? null : (e.target.value as EventType),
                )
              }
              className={formFieldClasses}
            >
              <option value={ALL_OPTION} className={formOptionClasses}>All Types</option>
              {EVENT_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type} className={formOptionClasses}>
                  {EVENT_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor={`${fieldId}-status`} className={formLabelClasses}>Status</label>
            <select
              id={`${fieldId}-status`}
              value={filterStatus ?? ALL_OPTION}
              onChange={(e) =>
                onFilterStatusChange(
                  e.target.value === ALL_OPTION ? null : (e.target.value as EventStatus),
                )
              }
              className={formFieldClasses}
            >
              <option value={ALL_OPTION} className={formOptionClasses}>All Statuses</option>
              {ITER_EVENT_STATUSES.map((status) => (
                <option key={status} value={status} className={formOptionClasses}>
                  {EVENT_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className={formLabelClasses}>Starts From</label>
            <DatePicker
              value={dateFrom}
              onChange={(date) =>
                onDateRangeChange({ dateFrom: toLocalDateKey(date), dateTo: dateRange.dateTo })
              }
              inputClassName={formDateFieldClasses}
              placeholder="Any date"
            />
          </div>
          <div>
            <label className={formLabelClasses}>Starts Until</label>
            <DatePicker
              value={dateTo}
              onChange={(date) =>
                onDateRangeChange({ dateFrom: dateRange.dateFrom, dateTo: toLocalDateKey(date) })
              }
              inputClassName={formDateFieldClasses}
              minDate={dateFrom ?? undefined}
              placeholder="Any date"
            />
          </div>
        </div>
      </div>

      {hasActiveFilters ? (
        <button
          type="button"
          onClick={clearFilters}
          className="w-full rounded-lg border border-white/20 px-4 py-2 text-stone-100 transition-colors hover:bg-white/10"
        >
          Clear Filters
        </button>
      ) : null}
    </div>
  )
}

export default SearchPanel
