import React, { useEffect, useState } from "react"
import type { Event, UpdateEvent } from "~/definitions/database"
import EventFormFields, { type EventFormValues } from "./EventFormFields"

interface EditEventSidebarFormProps {
  event: Event | null
  onSave: (updates: UpdateEvent) => Promise<void>
  onCancel: () => void
}

function createFormValuesFromEvent(event: Event | null): EventFormValues {
  return {
    title: event?.title ?? "",
    type: event?.type ?? "function",
    status: event?.status ?? "new_lead",
    clientName: event?.clientName ?? "",
    clientEmail: event?.clientEmail ?? "",
    clientPhone: event?.clientPhone ?? "",
    startDateTime: event?.startDateTime ?? new Date().toISOString(),
    endDateTime: event?.endDateTime ?? new Date().toISOString(),
    minGuests: event?.minGuests ?? 0,
    maxGuests: event?.maxGuests ?? 0,
  }
}

export const EditEventSidebarForm: React.FC<EditEventSidebarFormProps> = ({
  event,
  onSave,
  onCancel,
}) => {
  const [formValues, setFormValues] = useState<EventFormValues>(createFormValuesFromEvent(event))
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    setFormValues(createFormValuesFromEvent(event))
  }, [event])

  const handleSave = async () => {
    if (!event || !formValues.title || isSubmitting) return

    setIsSubmitting(true)
    try {
      const updates: UpdateEvent = {
        title: formValues.title,
        type: formValues.type,
        status: formValues.status,
        clientName: formValues.clientName,
        clientEmail: formValues.clientEmail,
        clientPhone: formValues.clientPhone,
        startDateTime: formValues.startDateTime,
        endDateTime: formValues.endDateTime,
        minGuests: formValues.minGuests,
        maxGuests: formValues.maxGuests,
      }
      await onSave(updates)
      onCancel()
    } catch {
      // Mutation errors are surfaced by hook-level toasts.
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!event) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-stone-100">Edit Event</h2>
        <p className="text-sm text-stone-300">No event is selected for editing.</p>
        <button
          type="button"
          onClick={onCancel}
          className="w-full rounded-lg border border-white/20 px-4 py-2 text-stone-100 transition-colors hover:bg-white/10"
        >
          Back
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4">
      <div>
        <h2 className="text-lg font-semibold text-stone-100">Edit Event</h2>
        <p className="mt-1 text-sm text-stone-300">Update event details and save your changes.</p>
      </div>

      <EventFormFields
        values={formValues}
        onChange={(updates) => setFormValues((current) => ({ ...current, ...updates }))}
      />

      <div className="flex gap-3 pb-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-white/20 px-4 py-2 text-stone-100 transition-colors hover:bg-white/10"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!formValues.title || isSubmitting}
          className="flex-1 rounded-lg bg-orange-500 px-4 py-2 font-medium text-stone-950 transition-colors hover:bg-orange-400 disabled:bg-stone-900 disabled:text-stone-700"
        >
          Save
        </button>
      </div>
    </div>
  )
}

export default EditEventSidebarForm
