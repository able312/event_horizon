import React, { useEffect, useState } from "react"
import type { AssignContactTarget } from "~/definitions/contacts"
import type { NewEvent } from "~/definitions/database"
import { hasFormErrors } from "~/features/contacts/lib/contactForm"
import { isContactsError } from "~/lib/contacts/contactsError"
import ClientPickerField from "./ClientPickerField"
import EventFormFields, {
  type EventFormValues,
} from "./EventFormFields"
import { isCreateEventFormValid } from "./eventFormValidation"
import {
  EMPTY_CLIENT_SELECTION,
  toClientTarget,
  validateClientSelection,
  type ClientSelection,
} from "./clientPickerForm"
import type { CalendarDraftPreview } from "~/features/calendar/lib/calendarDraftPreview"

interface CreateEventSidebarFormProps {
  initialStartDateTime?: string
  initialEndDateTime?: string
  /** client is an existing contact or a new one to create, or null when the client section was left blank */
  onCreate: (event: NewEvent, client: AssignContactTarget | null) => Promise<void>
  onCancel: () => void
  onDraftPreviewChange?: (draft: CalendarDraftPreview | null) => void
}

function createDefaultFormValues(
  initialStartDateTime?: string,
  initialEndDateTime?: string,
): EventFormValues {
  return {
    title: "",
    type: "function",
    status: "new_lead",
    startDateTime: initialStartDateTime ?? null,
    endDateTime: initialEndDateTime ?? initialStartDateTime ?? null,
    minGuests: 0,
    maxGuests: 0,
  }
}

const CreateEventSidebarForm: React.FC<CreateEventSidebarFormProps> = ({
  initialStartDateTime,
  initialEndDateTime,
  onCreate,
  onCancel,
  onDraftPreviewChange,
}) => {
  const [formValues, setFormValues] = useState<EventFormValues>(() =>
    createDefaultFormValues(initialStartDateTime, initialEndDateTime),
  )
  const [clientSelection, setClientSelection] = useState<ClientSelection>(EMPTY_CLIENT_SELECTION)
  const [emailConflict, setEmailConflict] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const clientErrors = validateClientSelection(clientSelection)
  const canCreate = isCreateEventFormValid(formValues) && !hasFormErrors(clientErrors) && !isSubmitting

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
    setClientSelection(EMPTY_CLIENT_SELECTION)
    onCancel()
  }

  const handleClientChange = (selection: ClientSelection) => {
    setClientSelection(selection)
    setEmailConflict(null)
  }

  const handleCreate = async () => {
    if (!canCreate) return

    setIsSubmitting(true)
    try {
      const newEvent = {
        title: formValues.title,
        type: formValues.type,
        status: formValues.status,
        startDateTime: formValues.startDateTime,
        endDateTime: formValues.endDateTime,
        minGuests: formValues.minGuests,
        maxGuests: formValues.maxGuests,
      } as NewEvent
      await onCreate(newEvent, toClientTarget(clientSelection))
      setFormValues(createDefaultFormValues(initialStartDateTime, initialEndDateTime))
      setClientSelection(EMPTY_CLIENT_SELECTION)
      onCancel()
    } catch (err) {
      // Other mutation errors are surfaced by hook-level toasts.
      if (isContactsError(err) && err.code === "EmailTaken") setEmailConflict(err.message)
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
        clientFields={
          <ClientPickerField
            selection={clientSelection}
            errors={clientErrors}
            emailConflict={emailConflict}
            onChange={handleClientChange}
          />
        }
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
          disabled={!canCreate}
          className="flex-1 rounded-lg bg-orange-500 px-4 py-2 font-medium text-stone-950 transition-colors hover:bg-orange-400 disabled:bg-stone-900 disabled:text-stone-700"
        >
          Create
        </button>
      </div>
    </div>
  )
}

export default CreateEventSidebarForm
