/**
 * EventDialogs Component
 * 
 * Contains all dialog modals used in the EventDetail page:
 * - DateTimeDialog: Edit event start/end date and time
 * - GuestCountDialog: Edit min/max guests and final count toggle
 * - EditEventDialog: Edit event title and type
 * 
 * Each dialog manages its own temporary state and callbacks
 * to keep the parent component clean.
 * 
 * Location: src/components/event-detail/EventDialogs.tsx
 */

import React, { useState, useEffect } from "react"
import type { EventType } from "~/definitions/database"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog"
import { Button } from "~/components/ui/button"
import DateTimeInput from "~/components/ui/DateTimeInput"
import { EVENT_TYPE_OPTIONS } from "~/definitions/events/ui"

// ============================================================================
// Types
// ============================================================================

/** Temporary state for guest count dialog */
interface TempGuests {
  min: number
  max: number
  final: boolean
}

// ============================================================================
// DateTimeDialog
// ============================================================================

interface DateTimeDialogProps {
  /** Whether the dialog is currently open */
  open: boolean
  /** Callback to close the dialog */
  onOpenChange: (open: boolean) => void
  /** Current event start datetime */
  startDateTime: string
  /** Current event end datetime */
  endDateTime: string
  /** Callback to save the new date/time values */
  onSave: (startDateTime: string, endDateTime: string) => void
}

/**
 * DateTimeDialog Component
 * 
 * Modal dialog for editing event start and end date/time.
 * Opens with current values pre-filled, saves on confirm.
 */
export const DateTimeDialog: React.FC<DateTimeDialogProps> = ({
  open,
  onOpenChange,
  startDateTime,
  endDateTime,
  onSave,
}) => {
  // Temporary state for form inputs
  const [tempStartDateTime, setTempStartDateTime] = useState<string>("")
  const [tempEndDateTime, setTempEndDateTime] = useState<string>("")

  // Initialize form with current event values when dialog opens
  useEffect(() => {
    if (open) {
      setTempStartDateTime(startDateTime || new Date().toISOString())
      setTempEndDateTime(endDateTime || new Date().toISOString())
    }
  }, [open, startDateTime, endDateTime])

  // Handle save button click
  const handleSave = () => {
    onSave(tempStartDateTime, tempEndDateTime)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Date & Time</DialogTitle>
        </DialogHeader>
        
        {/* Date/Time Form Fields */}
        <div className="space-y-4 py-4">
          {/* Start Date & Time */}
          <DateTimeInput
            label="Start Date"
            value={tempStartDateTime || null}
            onChange={setTempStartDateTime}
          />

          {/* End Date & Time */}
          <DateTimeInput
            label="End Date"
            value={tempEndDateTime || null}
            onChange={setTempEndDateTime}
          />
        </div>
        
        {/* Dialog Actions */}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// GuestCountDialog
// ============================================================================

interface GuestCountDialogProps {
  /** Whether the dialog is currently open */
  open: boolean
  /** Callback to close the dialog */
  onOpenChange: (open: boolean) => void
  /** Current min guests */
  minGuests: number
  /** Current max guests */
  maxGuests: number
  /** Whether guest count is final */
  guestCountFinal: boolean
  /** Callback to save the new guest count values */
  onSave: (minGuests: number, maxGuests: number, guestCountFinal: boolean) => void
}

/**
 * GuestCountDialog Component
 * 
 * Modal dialog for editing guest count settings.
 * Allows setting min/max guests and marking count as final.
 */
export const GuestCountDialog: React.FC<GuestCountDialogProps> = ({
  open,
  onOpenChange,
  minGuests,
  maxGuests,
  guestCountFinal,
  onSave,
}) => {
  // Temporary state for form inputs
  const [tempGuests, setTempGuests] = useState<TempGuests>({
    min: 0,
    max: 0,
    final: false,
  })

  // Initialize form with current values when dialog opens
  useEffect(() => {
    if (open) {
      setTempGuests({
        min: minGuests,
        max: maxGuests,
        final: guestCountFinal,
      })
    }
  }, [open, minGuests, maxGuests, guestCountFinal])

  // Handle save button click
  const handleSave = () => {
    onSave(tempGuests.min, tempGuests.max, tempGuests.final)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Guest Count</DialogTitle>
        </DialogHeader>
        
        {/* Guest Count Form Fields */}
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Min Guests */}
            <div>
              <label className="text-sm font-medium block mb-1">Min Guests</label>
              <input
                type="number"
                value={tempGuests.min}
                onChange={(e) => setTempGuests({ ...tempGuests, min: parseInt(e.target.value) || 0 })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            
            {/* Max Guests */}
            <div>
              <label className="text-sm font-medium block mb-1">Max Guests</label>
              <input
                type="number"
                value={tempGuests.max}
                onChange={(e) => setTempGuests({ ...tempGuests, max: parseInt(e.target.value) || 0 })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>
          
          {/* Final Count Checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="guestFinal"
              checked={tempGuests.final}
              onChange={(e) => setTempGuests({ ...tempGuests, final: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="guestFinal" className="text-sm">
              Final guest count (not estimated)
            </label>
          </div>
        </div>
        
        {/* Dialog Actions */}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// EditEventDialog
// ============================================================================

interface EditEventDialogProps {
  /** Whether the dialog is currently open */
  open: boolean
  /** Callback to close the dialog */
  onOpenChange: (open: boolean) => void
  /** Current event title */
  title: string
  /** Current event type */
  type: EventType
  /** Callback to save the new event details */
  onSave: (title: string, type: EventType) => void
}

/**
 * EditEventDialog Component
 * 
 * Modal dialog for editing basic event information:
 * - Event title
 * - Event type (Tournament, Wedding, Function)
 */
export const EditEventDialog: React.FC<EditEventDialogProps> = ({
  open,
  onOpenChange,
  title,
  type,
  onSave,
}) => {
  // Temporary state for form inputs
  const [tempTitle, setTempTitle] = useState(title)
  const [tempType, setTempType] = useState<EventType>(type)

  // Initialize form with current values when dialog opens
  useEffect(() => {
    if (open) {
      setTempTitle(title)
      setTempType(type)
    }
  }, [open, title, type])

  // Handle save button click
  const handleSave = () => {
    onSave(tempTitle, tempType)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
        </DialogHeader>
        
        {/* Event Details Form Fields */}
        <div className="space-y-4 py-4">
          {/* Event Title */}
          <div>
            <label className="text-sm font-medium block mb-1">Event Title</label>
            <input
              type="text"
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          
          {/* Event Type */}
          <div>
            <label className="text-sm font-medium block mb-1">Event Type</label>
            <select
              value={tempType as string}
              onChange={(e) => setTempType(e.target.value as "tournament" | "wedding" | "function")}
              className="w-full border rounded-lg px-3 py-2"
            >
              {EVENT_TYPE_OPTIONS.map((eventType) => (
                <option key={eventType} value={eventType}>
                  {eventType.charAt(0).toUpperCase() + eventType.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Dialog Actions */}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
