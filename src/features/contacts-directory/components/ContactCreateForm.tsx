import { useState } from "react"
import { toast } from "sonner"

import { Button } from "~/components/atoms/button"
import type { Contact } from "~/definitions/contacts"
import { ContactFormFields } from "~/features/contacts/components/ContactFormFields"
import { InlineFormPanel } from "~/features/contacts/components/InlineFormPanel"
import { hasFormErrors, validateContactForm, type ContactFormErrors } from "~/features/contacts/lib/contactForm"
import { getContactsErrorMessage } from "~/features/contacts/lib/eventContactsPanel"
import { useCreateContact } from "~/hooks/useEventContacts"
import { isContactsError } from "~/lib/contacts/contactsError"

import {
  EMPTY_DIRECTORY_CONTACT_FORM,
  toDirectoryContactPayload,
  type DirectoryContactFormValues,
} from "../lib/directoryContactForm"

type EmailConflict = { contactId: string; message: string }

type ContactCreateFormProps = {
  onCreated: (contact: Contact) => void
  /** Leaves creation mode and opens the contact that already owns the email. */
  onViewExisting: (contactId: string) => void
  onCancel: () => void
}

export const ContactCreateForm: React.FC<ContactCreateFormProps> = ({ onCreated, onViewExisting, onCancel }) => {
  const [form, setForm] = useState<DirectoryContactFormValues>(EMPTY_DIRECTORY_CONTACT_FORM)
  const [errors, setErrors] = useState<ContactFormErrors>({})
  const [emailConflict, setEmailConflict] = useState<EmailConflict | null>(null)
  const createContact = useCreateContact()

  const handleSave = async () => {
    const validationErrors = validateContactForm(form)
    setErrors(validationErrors)
    if (hasFormErrors(validationErrors)) return

    setEmailConflict(null)
    try {
      const created = await createContact.mutateAsync(toDirectoryContactPayload(form))
      toast.success("Contact created")
      onCreated(created)
    } catch (err) {
      if (isContactsError(err) && err.code === "EmailTaken" && err.existingContactId) {
        setEmailConflict({ contactId: err.existingContactId, message: err.message })
        return
      }
      toast.error(getContactsErrorMessage(err, "Failed to create contact"))
    }
  }

  return (
    <InlineFormPanel
      title="New contact"
      description="Add someone to your contact directory."
      onCancel={onCancel}
      footer={
        <>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" size="sm" disabled={createContact.isPending} onClick={() => void handleSave()}>
            {createContact.isPending ? "Creating…" : "Create"}
          </Button>
        </>
      }
    >
      <ContactFormFields
        values={form}
        errors={errors}
        onChange={(patch) => {
          setEmailConflict(null)
          setForm((current) => ({ ...current, ...patch }))
        }}
      />
      <div>
        <label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Notes (optional)</label>
        <textarea
          value={form.notes}
          onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
          rows={3}
          className="w-full rounded-md border border-stone-300 bg-transparent px-3 py-1.5 text-sm shadow-xs outline-none focus-visible:ring-[2px] focus-visible:ring-orange-500"
        />
      </div>
      {emailConflict ? (
        <p className="text-xs text-destructive">
          {emailConflict.message}{" "}
          <button
            type="button"
            onClick={() => onViewExisting(emailConflict.contactId)}
            className="font-medium underline"
          >
            View existing contact →
          </button>
        </p>
      ) : null}
    </InlineFormPanel>
  )
}
