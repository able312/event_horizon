import type { NewContact } from "~/definitions/contacts"
import {
  EMPTY_CONTACT_FORM,
  toContactPayload,
  validateContactForm,
  type ContactFormErrors,
  type ContactFormValues,
} from "~/features/contacts/lib/contactForm"

/** The optional client section of the create-event form. Blank means "no client yet". */
export type NewClientFormValues = {
  name: string
  email: string
  phone: string
}

export const EMPTY_NEW_CLIENT: NewClientFormValues = { name: "", email: "", phone: "" }

export function isNewClientBlank(values: NewClientFormValues): boolean {
  return ![values.name, values.email, values.phone].some((value) => value.trim())
}

/** Splits the single name input into first/last name ("Mary Ann Smith" → "Mary" / "Ann Smith"). */
function toContactFormValues(values: NewClientFormValues): ContactFormValues {
  const [firstName = "", ...rest] = values.name.trim().split(/\s+/)
  return {
    ...EMPTY_CONTACT_FORM,
    firstName,
    lastName: rest.join(" "),
    email: values.email,
    phone: values.phone,
  }
}

/** A blank section is valid (no client); otherwise the same rules as the contacts dialog apply. */
export function validateNewClient(values: NewClientFormValues): ContactFormErrors {
  if (isNewClientBlank(values)) return {}
  return validateContactForm(toContactFormValues(values))
}

/** The contact to assign as the event's primary client, or null when the section is blank. */
export function toNewClientContact(values: NewClientFormValues): NewContact | null {
  if (isNewClientBlank(values)) return null
  return toContactPayload(toContactFormValues(values))
}
