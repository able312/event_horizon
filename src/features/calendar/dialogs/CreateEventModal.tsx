/**
 * CreateEventModal Component
 * 
 * A modal dialog for creating a new event.
 * Displays a form with fields for event details.
 * 
 * Features:
 * - Event title (required)
 * - Event type (Tournament, Wedding, Function)
 * - Status (all statuses except "lost")
 * - Client name
 * - Event date
 * - Max guests
 * 
 * Location: src/features/calendar/dialogs/CreateEventModal.tsx
 */

import React, { useState } from "react"
import type { NewEvent } from "~/definitions/database"
import { ITER_EVENT_STATUSES } from "~/definitions/events/event-constants"
import { EVENT_TYPE_OPTIONS, EVENT_TYPE_LABELS, EVENT_STATUS_LABELS } from "~/definitions/events/ui"
import DateTimeInput from "~/components/ui/DateTimeInput"

interface CreateEventModalProps {
  /** Whether the modal is currently open */
  open: boolean
  /** Callback to close the modal */
  onOpenChange: (open: boolean) => void
  /** Callback to create a new event */
  onCreate: (event: NewEvent) => Promise<void>
}

/**
 * CreateEventModal
 * 
 * Form modal for creating new events.
 * Manages its own form state until submission.
 */
export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  open,
  onOpenChange,
  onCreate,
}) => {
  // Form state for new event
  const [newEvent, setNewEvent] = useState<Partial<NewEvent>>({
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

  // Reset form when modal closes
  React.useEffect(() => {
    if (!open) {
      setNewEvent({
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
    }
  }, [open])

  // Handle form submission
  const handleCreate = async () => {
    if (!newEvent.title) return
    try {
      await onCreate(newEvent as NewEvent)
      onOpenChange(false)
    } catch {
      // Mutation errors are surfaced by hook-level toasts.
    }
  }

  // Don't render anything if modal is closed
  if (!open) return null

  return (
    /**
     * Modal Overlay
     * - Fixed full-screen backdrop
     * - Centered modal card
     */
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
        
        {/* Modal Title */}
        <h2 className="text-xl font-bold mb-4">Create New Event</h2>
        
        {/* Form Fields */}
        <div className="space-y-4">
          {/* Event Title - Required */}
          <div>
            <label className="block text-sm font-medium mb-1">Event Title *</label>
            <input
              type="text"
              value={newEvent.title}
              onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
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
                value={newEvent.type}
                onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as "tournament" | "wedding" | "function" })}
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
                value={newEvent.status}
                onChange={(e) => setNewEvent({ ...newEvent, status: e.target.value as typeof newEvent.status })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                {ITER_EVENT_STATUSES.filter(s => s !== "lost").map(status => (
                  <option key={status} value={status}>{EVENT_STATUS_LABELS[status]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Client Name, Email, Phone - Stack */}
          <div>
            <label className="block text-sm font-medium mb-1">Client Name</label>
            <input
              type="text"
              value={newEvent.clientName || ""}
              onChange={(e) => setNewEvent({ ...newEvent, clientName: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Client Email</label>
            <input
              type="email"
              value={newEvent.clientEmail || ""}
              onChange={(e) => setNewEvent({ ...newEvent, clientEmail: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Client Phone</label>
            <input
              type="tel"
              value={newEvent.clientPhone || ""}
              onChange={(e) => setNewEvent({ ...newEvent, clientPhone: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          {/* Start Date & Time */}
          <DateTimeInput
            label="Start Date"
            value={newEvent.startDateTime || null}
            onChange={(val) => setNewEvent({ ...newEvent, startDateTime: val })}
          />

          {/* End Date & Time */}
          <DateTimeInput
            label="End Date"
            value={newEvent.endDateTime || null}
            onChange={(val) => setNewEvent({ ...newEvent, endDateTime: val })}
          />

          {/* Min and Max Guests - Side by side */}
          <div className="grid grid-cols-2 gap-4">
            {/* Min Guests */}
            <div>
              <label className="block text-sm font-medium mb-1">Min Guests</label>
              <input
                type="number"
                value={newEvent.minGuests || ""}
                onChange={(e) => setNewEvent({ ...newEvent, minGuests: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            {/* Max Guests */}
            <div>
              <label className="block text-sm font-medium mb-1">Max Guests</label>
              <input
                type="number"
                value={newEvent.maxGuests || ""}
                onChange={(e) => setNewEvent({ ...newEvent, maxGuests: parseInt(e.target.value) || 0 })}
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
            onClick={handleCreate}
            disabled={!newEvent.title}
            className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  )
}

export default CreateEventModal
