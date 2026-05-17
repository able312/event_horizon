/**
 * DateTimeInput Component
 * 
 * A combined date and time input component.
 * Displays a DatePicker and time input side by side.
 * 
 * Features:
 * - Date picker for selecting the date
 * - Time input for selecting the time
 * - Preserves either date or time when the other changes
 * - Returns ISO string to parent
 * 
 * Location: src/components/ui/DateTimeInput.tsx
 */

import React from "react"
import { DatePicker } from "~/components/ui/date-picker"
import { cn } from "~/lib/utils"

interface DateTimeInputProps {
  /** Label for the datetime input */
  label: string
  /** Current value as ISO date string */
  value: string | null
  /** Callback when datetime changes */
  onChange: (value: string) => void
  /** Optional className for the outer grid */
  className?: string
  /** Optional className for labels */
  labelClassName?: string
  /** Optional className for the date text input */
  dateInputClassName?: string
  /** Optional className for the time input */
  timeInputClassName?: string
}

/**
 * DateTimeInput
 * 
 * Combines a DatePicker and time input into a single component.
 * Maintains the time portion when the date changes, and vice versa.
 */
const DateTimeInput: React.FC<DateTimeInputProps> = ({
  label,
  value,
  onChange,
  className,
  labelClassName,
  dateInputClassName,
  timeInputClassName,
}) => {
  /**
   * Handle date change
   * Preserves the existing time from the value
   */
  const handleDateChange = (date: Date | undefined) => {
    if (!date) return
    
    const currentDate = value ? new Date(value) : new Date()
    const hours = currentDate.getHours()
    const minutes = currentDate.getMinutes()
    
    const newDate = new Date(date)
    newDate.setHours(hours, minutes, 0, 0)
    
    onChange(newDate.toISOString())
  }

  /**
   * Handle time change
   * Preserves the existing date from the value
   */
  const handleTimeChange = (timeValue: string) => {
    const [hours, minutes] = timeValue.split(":").map(Number)
    
    const currentDate = value ? new Date(value) : new Date()
    currentDate.setHours(hours, minutes, 0, 0)
    
    onChange(currentDate.toISOString())
  }

  /**
   * Get the time portion from the value
   */
  const getTimeValue = (): string => {
    if (!value) return ""
    return new Date(value).toTimeString().slice(0, 5)
  }

  return (
    /**
     * Container
     * - Two column grid: date on left, time on right
     */
    <div className={cn("grid grid-cols-2 gap-2", className)}>
      {/* Date Picker Column */}
      <div>
        <label className={cn("mb-1 block text-sm font-medium", labelClassName)}>{label}</label>
        <DatePicker 
          defaultValue={value ? new Date(value) : new Date()}
          onChange={handleDateChange}
          inputClassName={dateInputClassName}
        />
      </div>

      {/* Time Input Column */}
      <div>
        <label className={cn("mb-1 block text-sm font-medium", labelClassName)}>Time</label>
        <input
          type="time"
          value={getTimeValue()}
          onChange={(e) => handleTimeChange(e.target.value)}
          className={cn("w-full rounded-lg border px-3 py-2", timeInputClassName)}
        />
      </div>
    </div>
  )
}

export default DateTimeInput
