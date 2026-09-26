import type { Contact, ContactKind, NewContact } from "~/definitions/contacts"
import { cleanText, deriveDisplayName, isValidEmail } from "~/lib/contacts/contactRules"

/** Controlled-input state for the create/edit contact form. Strings only, so inputs never go uncontrolled. */
export type ContactFormValues = {
  kind: ContactKind
  firstName: string
  lastName: string
  organizationName: string
  email: string
  phone: string
}

export type ContactFormErrors = Partial<Record<"name" | "email", string>>

export const EMPTY_CONTACT_FORM: ContactFormValues = {
  kind: "individual",
  firstName: "",
  lastName: "",
  organizationName: "",
  email: "",
  phone: "",
}

export function contactToFormValues(contact: Contact): ContactFormValues {
  return {
    kind: contact.kind,
    firstName: contact.firstName ?? "",
    lastName: contact.lastName ?? "",
    organizationName: contact.organizationName ?? "",
    email: contact.email ?? "",
    phone: contact.phone ?? "",
  }
}

/**
 * Seeds a new-contact form from whatever the user typed into search:
 * an email goes to the email field, anything else is split into first/last name.
 */
export function formValuesFromSearch(query: string): ContactFormValues {
  const text = query.trim()
  if (!text) return EMPTY_CONTACT_FORM
  if (text.includes("@")) return { ...EMPTY_CONTACT_FORM, email: text }

  const [firstName = "", ...rest] = text.split(/\s+/)
  return { ...EMPTY_CONTACT_FORM, firstName, lastName: rest.join(" ") }
}

export function validateContactForm(values: ContactFormValues): ContactFormErrors {
  const errors: ContactFormErrors = {}

  if (!deriveDisplayName(toNameParts(values))) {
    errors.name = values.kind === "organization" ? "Organization name is required" : "A first or last name is required"
  }

  const email = cleanText(values.email)
  if (email && !isValidEmail(email)) {
    errors.email = "Enter a valid email address"
  }

  return errors
}

export function hasFormErrors(errors: ContactFormErrors): boolean {
  return Object.keys(errors).length > 0
}

/**
 * Builds the payload for create/update. displayName is left to the back end to derive
 * (it keeps a customised display name on update).
 */
export function toContactPayload(values: ContactFormValues): NewContact {
  return {
    kind: values.kind,
    firstName: cleanText(values.firstName),
    lastName: cleanText(values.lastName),
    organizationName: cleanText(values.organizationName),
    email: cleanText(values.email),
    phone: cleanText(values.phone),
  }
}

function toNameParts(values: ContactFormValues) {
  return {
    kind: values.kind,
    firstName: values.firstName,
    lastName: values.lastName,
    organizationName: values.organizationName,
  }
}
