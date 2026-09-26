import { useState } from "react"
import { toast } from "sonner"

import { Button } from "~/components/atoms/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/atoms/dialog"
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

export type EditTarget = { role: ContactRoleType; item: EventContactsPanelItem }

type EditEventContactDialogProps = {
  target: EditTarget | null
  onOpenChange: (open: boolean) => void
  isSaving: boolean
  onSave: (variables: SaveEventContactVariables) => Promise<unknown>
}

export const EditEventContactDialog: React.FC<EditEventContactDialogProps> = ({
  target,
  onOpenChange,
  isSaving,
  onSave,
}) => {
  const { data: contact, isLoading, isError } = useContact(target?.item.contactId ?? null)

  return (
    <Dialog open={Boolean(target)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit contact</DialogTitle>
          <DialogDescription>
            Contact details are shared across every event. The role label only applies to this event.
          </DialogDescription>
        </DialogHeader>

        {!target || isLoading ? (
          <p className="py-6 text-center text-xs text-muted-foreground">Loading contact…</p>
        ) : isError || !contact ? (
          <p className="py-6 text-center text-xs text-destructive">Couldn't load this contact.</p>
        ) : (
          // Keyed so the form re-seeds when a different contact is opened
          <EditEventContactForm
            key={target.item.eventContactId}
            target={target}
            contact={contact}
            isSaving={isSaving}
            onSave={onSave}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

type EditEventContactFormProps = {
  target: EditTarget
  contact: Contact
  isSaving: boolean
  onSave: (variables: SaveEventContactVariables) => Promise<unknown>
  onClose: () => void
}

const EditEventContactForm: React.FC<EditEventContactFormProps> = ({ target, contact, isSaving, onSave, onClose }) => {
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
        contactId: contact.id,
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
    <>
      <div className="space-y-4">
        <ContactFormFields
          values={form}
          errors={formErrors}
          onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
        />
        <div className="space-y-2 border-t border-border pt-4">
          <p className="text-xs font-medium text-muted-foreground">
            On this event · {ROLE_LABELS[target.role].singular}
          </p>
          <AssignmentFields
            values={assignment}
            showRolePicker={false}
            categoryError={assignmentError}
            onChange={(patch) => setAssignment((current) => ({ ...current, ...patch }))}
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" disabled={isSaving} onClick={() => void handleSave()}>
          {isSaving ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </>
  )
}
