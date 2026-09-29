import type { Contact, NewContact } from "~/definitions/contacts"
import { cleanText } from "~/lib/contacts/contactRules"
import { contactToFormValues, toContactPayload, type ContactFormValues } from "~/features/contacts/lib/contactForm"

/** Contact form values plus the notes field, which only this page's forms expose. */
export type DirectoryContactFormValues = ContactFormValues & { notes: string }

export const EMPTY_DIRECTORY_CONTACT_FORM: DirectoryContactFormValues = {
  kind: "individual",
  firstName: "",
  lastName: "",
  organizationName: "",
  email: "",
  phone: "",
  notes: "",
}

export function directoryContactToFormValues(contact: Contact): DirectoryContactFormValues {
  return { ...contactToFormValues(contact), notes: contact.notes ?? "" }
}

/** Builds the create/update payload, including notes; blank notes are saved as null. */
export function toDirectoryContactPayload(values: DirectoryContactFormValues): NewContact {
  return { ...toContactPayload(values), notes: cleanText(values.notes) }
}

/** Plain-text contact card for pasting into emails or notes, mirroring formatContactPlainText for event rows. */
export function formatDirectoryContactPlainText(contact: Contact): string {
  const lines = [contact.displayName]
  if (contact.email) lines.push(`Email: ${contact.email}`)
  if (contact.phone) lines.push(`Phone: ${contact.phone}`)
  if (contact.notes) lines.push(`Notes: ${contact.notes}`)
  return lines.join("\n")
}
