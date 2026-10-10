import type {
  Contact,
  ContactSearchRequest,
  ContactWithRoles,
  NewContact,
  Page,
  UpdateContact,
} from "~/definitions/contacts"
import { api } from "../../../convex/_generated/api"
import { fetchSource, pickFields, runMutation } from "./backend"
import { toId } from "./ids"
import { sources } from "./sources"

// Expected failures reject with a ContactsError, so callers can check `err.code`
// (e.g. EmailTaken with `err.existingContactId`); see translateBackendError.

/** Shared contact details a create or edit may set; the server derives the rest. */
export const CONTACT_FIELDS = [
  "kind", "firstName", "lastName", "organizationName", "displayName", "email", "phone", "notes",
] as const

export function getContactById(id: string): Promise<Contact | null> {
  return fetchSource(sources.contacts.byId(id))
}

/**
 * One page of matching contacts, ordered by name. `nextCursor` is opaque and only
 * valid for the same filters; change any filter and start again from the first page.
 */
export function searchContacts(params: ContactSearchRequest): Promise<Page<ContactWithRoles>> {
  return fetchSource(sources.contacts.search(params))
}

/** Rejects with ContactsError "EmailTaken" (carrying existingContactId) if the email is in use. */
export function createContact(input: NewContact): Promise<Contact> {
  return runMutation(api.contacts.create, { input: pickFields(input, CONTACT_FIELDS) })
}

export function updateContact(id: string, patch: UpdateContact): Promise<Contact> {
  return runMutation(api.contacts.update, { id: toId<"contacts">(id), patch: pickFields(patch, CONTACT_FIELDS) })
}

export async function archiveContact(id: string): Promise<void> {
  await runMutation(api.contacts.archive, { id: toId<"contacts">(id) })
}

export async function restoreContact(id: string): Promise<void> {
  await runMutation(api.contacts.restore, { id: toId<"contacts">(id) })
}

export function mergeContacts(sourceId: string, targetId: string): Promise<Contact> {
  return runMutation(api.contacts.merge, { sourceId: toId<"contacts">(sourceId), targetId: toId<"contacts">(targetId) })
}

/** Only succeeds for contacts with no event history; otherwise rejects with "ContactInUse". */
export async function deleteContact(id: string): Promise<void> {
  await runMutation(api.contacts.remove, { id: toId<"contacts">(id) })
}
