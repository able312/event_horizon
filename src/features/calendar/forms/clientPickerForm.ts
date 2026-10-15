import type { AssignContactTarget } from "~/definitions/contacts"
import {
  EMPTY_CONTACT_FORM,
  formValuesFromSearch,
  toContactPayload,
  validateContactForm,
  type ContactFormErrors,
  type ContactFormValues,
} from "~/features/contacts/lib/contactForm"

/** The new-client inputs that slide in after choosing "Create new contact". */
export type NewClientFormValues = {
  name: string
  email: string
  phone: string
}

/** An existing contact chosen from the search dropdown. */
export type PickedClient = { id: string; displayName: string }

/**
 * The client section of the create-event form: searching (an empty query means "no client yet"),
 * an existing contact picked, or a new contact being entered. `query` is kept so "Back to search" restores it.
 */
export type ClientSelection =
  | { mode: "search"; query: string }
  | { mode: "picked"; contact: PickedClient }
  | { mode: "create"; query: string; values: NewClientFormValues }

export const EMPTY_CLIENT_SELECTION: ClientSelection = { mode: "search", query: "" }

export const UNPICKED_CLIENT_ERROR = "Choose a contact from the list or create a new one"

export function searchClients(query: string): ClientSelection {
  return { mode: "search", query }
}

export function pickClient(contact: PickedClient): ClientSelection {
  return { mode: "picked", contact: { id: contact.id, displayName: contact.displayName } }
}

/** Pre-fills the new client from the search text: an email goes to Email, anything else to Name. */
export function startNewClient(query: string): ClientSelection {
  const { firstName, lastName, email } = formValuesFromSearch(query)
  const name = [firstName, lastName].filter(Boolean).join(" ")
  return { mode: "create", query, values: { name, email, phone: "" } }
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

/** Typed-but-unpicked search text blocks create, so a client is never silently dropped. */
export function validateClientSelection(selection: ClientSelection): ContactFormErrors {
  switch (selection.mode) {
    case "search":
      return selection.query.trim() ? { name: UNPICKED_CLIENT_ERROR } : {}
    case "picked":
      return {}
    case "create":
      return validateContactForm(toContactFormValues(selection.values))
  }
}

/** The event's primary client, or null when the section is empty. */
export function toClientTarget(selection: ClientSelection): AssignContactTarget | null {
  switch (selection.mode) {
    case "search":
      return null
    case "picked":
      return { contactId: selection.contact.id }
    case "create":
      return { newContact: toContactPayload(toContactFormValues(selection.values)) }
  }
}
