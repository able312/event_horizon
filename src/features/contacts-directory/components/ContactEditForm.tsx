import { useMemo, useState } from "react"
import { Link } from "react-router"
import { toast } from "sonner"

import { Button } from "~/components/atoms/button"
import type { Contact } from "~/definitions/contacts"
import { ContactFormFields } from "~/features/contacts/components/ContactFormFields"
import { InlineFormPanel } from "~/features/contacts/components/InlineFormPanel"
import { hasFormErrors, validateContactForm, type ContactFormErrors } from "~/features/contacts/lib/contactForm"
import { getContactsErrorMessage } from "~/features/contacts/lib/eventContactsPanel"
import { useUpdateContact } from "~/hooks/useEventContacts"
import { changedFields, hasChanges, useLiveDraft } from "~/hooks/useLiveDraft"
import { isContactsError } from "~/lib/contacts/contactsError"

import {
  directoryContactToFormValues,
  toDirectoryContactPayload,
  type DirectoryContactFormValues,
} from "../lib/directoryContactForm"

type EmailConflict = { contactId: string; message: string }

type ContactEditFormProps = {
  contact: Contact
  onSaved: () => void
  onCancel: () => void
}

/**
 * Keyed by contact.id in the parent, so switching contacts remounts this with fresh state.
 * Fields the user hasn't edited follow live updates to the contact.
 */
export const ContactEditForm: React.FC<ContactEditFormProps> = ({ contact, onSaved, onCancel }) => {
  const source = useMemo<DirectoryContactFormValues>(() => directoryContactToFormValues(contact), [contact])
  const { values: form, update } = useLiveDraft(source)
  const [errors, setErrors] = useState<ContactFormErrors>({})
  const [emailConflict, setEmailConflict] = useState<EmailConflict | null>(null)
  const updateContact = useUpdateContact()

  const handleSave = async () => {
    const validationErrors = validateContactForm(form)
    setErrors(validationErrors)
    if (hasFormErrors(validationErrors)) return

    // Only fields changed here, so other people's edits to the rest survive.
    const patch = changedFields(toDirectoryContactPayload(source), toDirectoryContactPayload(form))
    if (!hasChanges(patch)) {
      onSaved()
      return
    }

    setEmailConflict(null)
    try {
      await updateContact.mutateAsync({ id: contact.id, patch })
      toast.success("Contact saved")
      onSaved()
    } catch (err) {
      if (isContactsError(err) && err.code === "EmailTaken" && err.existingContactId) {
        setEmailConflict({ contactId: err.existingContactId, message: err.message })
        return
      }
      toast.error(getContactsErrorMessage(err, "Failed to save contact"))
    }
  }

  return (
    <InlineFormPanel
      title="Edit contact"
      description="These details are shared across every event this contact is on."
      onCancel={onCancel}
      footer={
        <>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" size="sm" disabled={updateContact.isPending} onClick={() => void handleSave()}>
            {updateContact.isPending ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <ContactFormFields
        values={form}
        errors={errors}
        onChange={(patch) => {
          setEmailConflict(null)
          update(patch)
        }}
      />
      <div>
        <label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Notes (optional)</label>
        <textarea
          value={form.notes}
          onChange={(event) => update({ notes: event.target.value })}
          rows={3}
          className="w-full rounded-md border border-stone-300 bg-transparent px-3 py-1.5 text-sm shadow-xs outline-none focus-visible:ring-[2px] focus-visible:ring-orange-500"
        />
      </div>
      {emailConflict ? (
        <p className="text-xs text-destructive">
          {emailConflict.message}{" "}
          <Link to={`/contacts/${emailConflict.contactId}`} className="font-medium underline">
            View existing contact →
          </Link>
        </p>
      ) : null}
    </InlineFormPanel>
  )
}
