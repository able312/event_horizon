import React, { useEffect, useState } from "react"
import type { NewEvent } from "~/definitions/database"
import EventFormFields, { type EventFormValues } from "./EventFormFields"
import type { CalendarDraftPreview } from "~/features/calendar/lib/calendarDraftPreview"

interface CreateEventSidebarFormProps {
  initialStartDateTime?: string
  initialEndDateTime?: string
  onCreate: (event: NewEvent) => Promise<void>
  onCancel: () => void
  onDraftPreviewChange?: (draft: CalendarDraftPreview | null) => void
}

function createDefaultFormValues(
  initialStartDateTime?: string,
  initialEndDateTime?: string,
): EventFormValues {
  const defaultDateTime = new Date().toISOString()

  return {
    title: "",
    type: "function",
    status: "new_lead",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    startDateTime: initialStartDateTime ?? defaultDateTime,
    endDateTime: initialEndDateTime ?? initialStartDateTime ?? defaultDateTime,
    minGuests: 0,
    maxGuests: 0,
  }
}

export const CreateEventSidebarForm: React.FC<CreateEventSidebarFormProps> = ({
  initialStartDateTime,
  initialEndDateTime,
  onCreate,
  onCancel,
  onDraftPreviewChange,
}) => {
  const [formValues, setFormValues] = useState<EventFormValues>(() =>
    createDefaultFormValues(initialStartDateTime, initialEndDateTime),
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!onDraftPreviewChange) return

    if (isSubmitting) {
      onDraftPreviewChange(null)
      return
    }

    const normalizedTitle =
      formValues.title.trim().length === 0 ? "Untitled" : formValues.title

    onDraftPreviewChange({
      title: normalizedTitle,
      startDateTime: formValues.startDateTime ?? null,
    })
  }, [
    formValues.startDateTime,
    formValues.title,
    isSubmitting,
    onDraftPreviewChange,
  ])

  const handleCancel = () => {
    onDraftPreviewChange?.(null)
    setFormValues(createDefaultFormValues(initialStartDateTime, initialEndDateTime))
    onCancel()
  }

  const handleCreate = async () => {
    if (!formValues.title || isSubmitting) return

    setIsSubmitting(true)
    try {
      const newEvent = {
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
      } as NewEvent
      await onCreate(newEvent)
      setFormValues(createDefaultFormValues(initialStartDateTime, initialEndDateTime))
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
        <h2 className="text-lg font-semibold text-stone-100">Create New Event</h2>
        <p className="mt-1 text-sm text-stone-300">Add the core details to get this event started.</p>
      </div>

      <EventFormFields
        values={formValues}
        onChange={(updates) => setFormValues((current) => ({ ...current, ...updates }))}
        autoFocusTitle
      />

      <div className="flex gap-3 pb-2">
        <button
          type="button"
          onClick={handleCancel}
          className="flex-1 rounded-lg border border-white/20 px-4 py-2 text-stone-100 transition-colors hover:bg-white/10"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleCreate}
          disabled={!formValues.title || isSubmitting}
          className="flex-1 rounded-lg bg-orange-500 px-4 py-2 font-medium text-stone-950 transition-colors hover:bg-orange-400 disabled:bg-stone-900 disabled:text-stone-700"
        >
          Create
        </button>
      </div>
    </div>
  )
}

export default CreateEventSidebarForm
