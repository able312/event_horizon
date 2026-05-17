/**
 * EditEventModal Component
 * 
 * A modal dialog for editing an existing event.
 * Pre-fills form with existing event data.
 * 
 * Features:
 * - Event title (required)
 * - Event type (Tournament, Wedding, Function)
 * - Status
 * - Client name, email, phone
 * - Start Date & Time
 * - End Date & Time
 * - Min/Max guests
 * 
 * Location: src/features/calendar/dialogs/EditEventModal.tsx
 */

import React, { useState, useEffect } from "react"
import type { Event, EventStatus, UpdateEvent } from "~/definitions/database"
import { ITER_EVENT_STATUSES } from "~/definitions/events/event-constants"
import { EVENT_TYPE_OPTIONS, EVENT_TYPE_LABELS, EVENT_STATUS_LABELS } from "~/definitions/events/ui"
import DateTimeInput from "~/components/ui/DateTimeInput"

interface EditEventModalProps {
  /** Whether the modal is currently open */
  open: boolean
  /** Callback to close the modal */
  onOpenChange: (open: boolean) => void
  /** The event being edited */
  event: Event | null
  /** Callback to save edited event */
  onSave: (updates: UpdateEvent) => Promise<void>
}

/**
 * EditEventModal
 * 
 * Form modal for editing existing events.
 */
export const EditEventModal: React.FC<EditEventModalProps> = ({
  open,
  onOpenChange,
  event,
  onSave,
}) => {
  // Form state for edited event
  const [editedEvent, setEditedEvent] = useState<Partial<Event>>({
    title: "",
    type: "function",
    status: "new_lead",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    startDateTime: new Date().toISOString(),
    endDateTime: new Date().toISOString(),
    minGuests: 0,
    maxGuests: 0,
  })

  // Initialize form when event changes
  useEffect(() => {
    if (event && open) {
      setEditedEvent({
        ...event,
        startDateTime: event.startDateTime || new Date().toISOString(),
        endDateTime: event.endDateTime || new Date().toISOString(),
      })
    }
  }, [event, open])

  // Handle form submission
  const handleSave = async () => {
    if (!editedEvent.title) return
    try {
      await onSave(editedEvent)
      onOpenChange(false)
    } catch {
      // Mutation errors are surfaced by hook-level toasts.
    }
  }

  // Don't render if closed or no event
  if (!open || !event) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        
        {/* Modal Title */}
        <h2 className="text-xl font-bold mb-4">Edit Event</h2>
        
        {/* Form Fields */}
        <div className="space-y-4">
          {/* Event Title - Required */}
          <div>
            <label className="block text-sm font-medium mb-1">Event Title *</label>
            <input
              type="text"
              value={editedEvent.title || ""}
              onChange={(e) => setEditedEvent({ ...editedEvent, title: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="e.g., Smith Wedding"
            />
          </div>

          {/* Type and Status - Side by side */}
          <div className="grid grid-cols-2 gap-4">
            {/* Event Type */}
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={editedEvent.type || "function"}
                onChange={(e) => setEditedEvent({ ...editedEvent, type: e.target.value as "tournament" | "wedding" | "function" })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                {EVENT_TYPE_OPTIONS.map(type => (
                  <option key={type} value={type}>{EVENT_TYPE_LABELS[type]}</option>
                ))}
              </select>
            </div>

            {/* Event Status */}
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={editedEvent.status || "new_lead"}
                onChange={(e) => setEditedEvent({ ...editedEvent, status: e.target.value as EventStatus })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                {ITER_EVENT_STATUSES.filter(s => s !== "lost").map(status => (
                  <option key={status} value={status}>{EVENT_STATUS_LABELS[status]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Client Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Client Name</label>
            <input
              type="text"
              value={editedEvent.clientName || ""}
              onChange={(e) => setEditedEvent({ ...editedEvent, clientName: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          {/* Client Email */}
          <div>
            <label className="block text-sm font-medium mb-1">Client Email</label>
            <input
              type="email"
              value={editedEvent.clientEmail || ""}
              onChange={(e) => setEditedEvent({ ...editedEvent, clientEmail: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          {/* Client Phone */}
          <div>
            <label className="block text-sm font-medium mb-1">Client Phone</label>
            <input
              type="tel"
              value={editedEvent.clientPhone || ""}
              onChange={(e) => setEditedEvent({ ...editedEvent, clientPhone: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          {/* Start Date & Time */}
          <DateTimeInput
            label="Start Date"
            value={editedEvent.startDateTime || null}
            onChange={(newValue) => setEditedEvent({ ...editedEvent, startDateTime: newValue })}
          />

          {/* End Date & Time */}
          <DateTimeInput
            label="End Date"
            value={editedEvent.endDateTime || null}
            onChange={(newValue) => setEditedEvent({ ...editedEvent, endDateTime: newValue })}
          />

          {/* Min and Max Guests - Side by side */}
          <div className="grid grid-cols-2 gap-4">
            {/* Min Guests */}
            <div>
              <label className="block text-sm font-medium mb-1">Min Guests</label>
              <input
                type="number"
                value={editedEvent.minGuests || ""}
                onChange={(e) => setEditedEvent({ ...editedEvent, minGuests: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            {/* Max Guests */}
            <div>
              <label className="block text-sm font-medium mb-1">Max Guests</label>
              <input
                type="number"
                value={editedEvent.maxGuests || ""}
                onChange={(e) => setEditedEvent({ ...editedEvent, maxGuests: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => onOpenChange(false)}
            className="flex-1 px-4 py-2 border rounded-lg hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!editedEvent.title}
            className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

export default EditEventModal
