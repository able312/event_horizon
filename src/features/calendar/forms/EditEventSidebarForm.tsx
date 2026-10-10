import React, { useMemo, useState } from "react"
import type { Event, UpdateEvent } from "~/definitions/database"
import { changedFields, hasChanges, useLiveDraft } from "~/hooks/useLiveDraft"
import EventFormFields, {
  type EventFormValues,
} from "./EventFormFields"
import { isEventFormValid } from "./eventFormValidation"

interface EditEventSidebarFormProps {
  event: Event | null
  onSave: (updates: UpdateEvent) => Promise<void>
  onCancel: () => void
}

function createFormValuesFromEvent(event: Event): EventFormValues {
  return {
    title: event.title,
    type: event.type,
    status: event.status,
    startDateTime: event.startDateTime,
    endDateTime: event.endDateTime,
    minGuests: event.minGuests ?? 0,
    maxGuests: event.maxGuests ?? 0,
  }
}

const EditEventSidebarForm: React.FC<EditEventSidebarFormProps> = ({
  event,
  onSave,
  onCancel,
}) => {
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

  // A different event starts a fresh draft; live updates to this one don't.
  return <EditEventFields key={event.id} event={event} onSave={onSave} onCancel={onCancel} />
}

const EditEventFields: React.FC<EditEventSidebarFormProps & { event: Event }> = ({ event, onSave, onCancel }) => {
  const source = useMemo(() => createFormValuesFromEvent(event), [event])
  const { values: formValues, update } = useLiveDraft(source)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSave = async () => {
    if (!isEventFormValid(formValues) || isSubmitting) return

    // Only fields changed here, so other people's edits to the rest survive.
    const updates: UpdateEvent = changedFields(source, formValues)
    if (!hasChanges(updates)) {
      onCancel()
      return
    }

    setIsSubmitting(true)
    try {
      await onSave(updates)
      onCancel()
    } catch {
      // Mutation errors are surfaced by hook-level toasts.
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 p-4">
      <div>
        <h2 className="text-lg font-semibold text-stone-100">Edit Event</h2>
        <p className="mt-1 text-sm text-stone-300">Update event details and save your changes.</p>
      </div>

      <EventFormFields
        values={formValues}
        onChange={update}
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
          disabled={!isEventFormValid(formValues) || isSubmitting}
          className="flex-1 rounded-lg bg-orange-500 px-4 py-2 font-medium text-stone-950 transition-colors hover:bg-orange-400 disabled:bg-stone-900 disabled:text-stone-700"
        >
          Save
        </button>
      </div>
    </div>
  )
}

export default EditEventSidebarForm
