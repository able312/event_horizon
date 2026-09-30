import { useState } from "react"
import { toast } from "sonner"

import { Button } from "~/components/atoms/button"
import type { Contact, ContactRoleType, EventContactsPanelItem } from "~/definitions/contacts"
import { useContact, type SaveEventContactVariables } from "~/hooks/useEventContacts"

import {
  assignmentFromPanelItem,
  getAssignmentError,
  toAssignmentPatch,
  type AssignmentValues,
} from "../lib/assignmentForm"
import {
  contactToFormValues,
  hasFormErrors,
  toContactPayload,
  validateContactForm,
  type ContactFormErrors,
  type ContactFormValues,
} from "../lib/contactForm"
import { getContactsErrorMessage, ROLE_LABELS } from "../lib/eventContactsPanel"
import { AssignmentFields } from "./AssignmentFields"
import { ContactFormFields } from "./ContactFormFields"
import { InlineFormPanel } from "./InlineFormPanel"

export type EditTarget = { role: ContactRoleType; item: EventContactsPanelItem }

type EditEventContactFormProps = {
  target: EditTarget
  isSaving: boolean
  onSave: (variables: SaveEventContactVariables) => Promise<unknown>
  onClose: () => void
}

const TITLE = "Edit contact"
const DESCRIPTION = "Contact details are shared across every event. The role label and notes only apply to this event."

/** Loads the full contact, then renders the edit form in place of the contact's row. */
export const EditEventContactForm: React.FC<EditEventContactFormProps> = ({ target, isSaving, onSave, onClose }) => {
  const { data: contact, isLoading, isError } = useContact(target.item.contactId)

  if (isLoading || isError || !contact) {
    return (
      <InlineFormPanel
        title={TITLE}
        description={DESCRIPTION}
        onCancel={onClose}
        footer={
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
        }
      >
        {isLoading ? (
          <p className="py-4 text-center text-xs text-muted-foreground">Loading contact…</p>
        ) : (
          <p className="py-4 text-center text-xs text-destructive">Couldn't load this contact.</p>
        )}
      </InlineFormPanel>
    )
  }

  return (
    <EditEventContactFields target={target} contact={contact} isSaving={isSaving} onSave={onSave} onClose={onClose} />
  )
}

type EditEventContactFieldsProps = EditEventContactFormProps & {
  contact: Contact
}

const EditEventContactFields: React.FC<EditEventContactFieldsProps> = ({
  target,
  contact,
  isSaving,
  onSave,
  onClose,
}) => {
  const [form, setForm] = useState<ContactFormValues>(() => contactToFormValues(contact))
  const [formErrors, setFormErrors] = useState<ContactFormErrors>({})
  const [assignment, setAssignment] = useState<AssignmentValues>(() =>
    assignmentFromPanelItem(target.role, target.item),
  )
  const assignmentError = getAssignmentError(assignment)

  const handleSave = async () => {
    const errors = validateContactForm(form)
    setFormErrors(errors)
    if (hasFormErrors(errors) || assignmentError) return

    try {
      await onSave({
        eventContactId: target.item.eventContactId,
        contact: toContactPayload(form),
        assignment: toAssignmentPatch(assignment),
      })
      toast.success("Contact saved")
      onClose()
    } catch (err) {
      toast.error(getContactsErrorMessage(err, "Failed to save contact"))
    }
  }

  return (
    <InlineFormPanel
      title={TITLE}
      description={DESCRIPTION}
      onCancel={onClose}
      footer={
        <>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" size="sm" disabled={isSaving} onClick={() => void handleSave()}>
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <ContactFormFields
        values={form}
        errors={formErrors}
        onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
      />
      <div className="space-y-2 border-t border-border pt-4">
        <p className="text-xs font-medium text-muted-foreground">On this event · {ROLE_LABELS[target.role].singular}</p>
        <AssignmentFields
          values={assignment}
          showRolePicker={false}
          categoryError={assignmentError}
          onChange={(patch) => setAssignment((current) => ({ ...current, ...patch }))}
        />
      </div>
    </InlineFormPanel>
  )
}
