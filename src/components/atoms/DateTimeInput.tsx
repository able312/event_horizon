/**
 * DateTimeInput Component
 *
 * A combined date and time input component.
 * Displays a DatePicker and time input side by side.
 *
 * Features:
 * - Date picker for selecting the date
 * - Time input for selecting the time (disabled until a date is set)
 * - Preserves either date or time when the other changes
 * - Returns ISO string or null to parent
 */

import React from "react"
import { DatePicker } from "~/components/atoms/date-picker"
import { Input } from "~/components/atoms/input"
import {
  combineDateWithTime,
  extractTimeString,
  replaceDatePreservingTime,
} from "~/components/atoms/dateTimeInput.lib"
import { cn } from "~/lib/utils"

interface DateTimeInputProps {
  /** Label for the datetime input */
  label: string
  /** Current value as ISO date string, or null when unset */
  value: string | null
  /** Callback when datetime changes (null clears the value) */
  onChange: (value: string | null) => void
  /** Optional minimum datetime — calendar days before this are disabled */
  minDateTime?: string | null
  /** Optional inline error message */
  error?: string
  /** Optional className for the outer grid */
  className?: string
  /** Optional className for labels */
  labelClassName?: string
  /** Optional className for the date text input */
  dateInputClassName?: string
  /** Optional className for the time input */
  timeInputClassName?: string
}

const DateTimeInput: React.FC<DateTimeInputProps> = ({
  label,
  value,
  onChange,
  minDateTime,
  error,
  className,
  labelClassName,
  dateInputClassName,
  timeInputClassName,
}) => {
  const handleDateChange = (date: Date | null) => {
    if (!date) {
      onChange(null)
      return
    }
    onChange(replaceDatePreservingTime(value, date))
  }

  const handleTimeChange = (timeValue: string) => {
    if (!value) return

    const currentDate = new Date(value)
    if (Number.isNaN(currentDate.getTime())) return

    onChange(combineDateWithTime(currentDate, timeValue || null))
  }

  const minDate = minDateTime ? new Date(minDateTime) : undefined
  const resolvedMinDate =
    minDate && !Number.isNaN(minDate.getTime()) ? minDate : undefined

  const dateValue = React.useMemo(() => {
    if (!value) return null
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }, [value])

  return (
    <div className={cn("space-y-1", className)}>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={cn("mb-1 block text-sm font-medium", labelClassName)}>
            {label}
          </label>
          <DatePicker
            value={dateValue}
            onChange={handleDateChange}
            inputClassName={dateInputClassName}
            minDate={resolvedMinDate}
          />
        </div>

        <div>
          <label className={cn("mb-1 block text-sm font-medium", labelClassName)}>
            Time
          </label>
          <Input
            type="time"
            value={extractTimeString(value)}
            onChange={(e) => handleTimeChange(e.target.value)}
            disabled={!value}
            aria-invalid={error ? true : undefined}
            className={cn("w-full rounded-lg border px-3 py-2", timeInputClassName)}
          />
        </div>
      </div>
      {error ? (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export default DateTimeInput
