import type {
  Contact,
  ContactSearchRequest,
  ContactWithRoles,
  NewContact,
  Page,
  UpdateContact,
} from "~/definitions/contacts"
import { invokeContactsChannel } from "./contactsIpcResult"

export function getContactById(id: string): Promise<Contact | null> {
  return invokeContactsChannel("contacts:get-by-id", id)
}

export function findContactByEmail(email: string): Promise<Contact | null> {
  return invokeContactsChannel("contacts:find-by-email", email)
}

export function searchContacts(params: ContactSearchRequest): Promise<Page<ContactWithRoles>> {
  return invokeContactsChannel("contacts:search", params)
}

/** Rejects with ContactsError "EmailTaken" (carrying existingContactId) if the email is in use. */
export function createContact(input: NewContact): Promise<Contact> {
  return invokeContactsChannel("contacts:post", input)
}

export function updateContact(id: string, patch: UpdateContact): Promise<Contact> {
  return invokeContactsChannel("contacts:patch", id, patch)
}

export function archiveContact(id: string): Promise<void> {
  return invokeContactsChannel("contacts:archive", id)
}

export function restoreContact(id: string): Promise<void> {
  return invokeContactsChannel("contacts:restore", id)
}

export function mergeContacts(sourceId: string, targetId: string): Promise<Contact> {
  return invokeContactsChannel("contacts:merge", sourceId, targetId)
}

/** Only succeeds for contacts with no event history; otherwise rejects with "ContactInUse". */
export function deleteContact(id: string): Promise<void> {
  return invokeContactsChannel("contacts:delete", id)
}
