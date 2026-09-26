import type {
  AssignContactTarget,
  AssignEventContactOptions,
  ContactEventHistory,
  ContactRoleType,
  EventContact,
  EventContactsPanel,
  RecipientResolution,
  RecipientSelection,
  UpdateEventContact,
} from "~/definitions/contacts"
import { invokeContactsChannel } from "./contactsIpcResult"

export function getEventContactsPanel(eventId: string): Promise<EventContactsPanel> {
  return invokeContactsChannel("event-contacts:get-panel", eventId)
}

export function assignEventContact(
  eventId: string,
  target: AssignContactTarget,
  role: ContactRoleType,
  opts?: AssignEventContactOptions,
): Promise<EventContact> {
  return invokeContactsChannel("event-contacts:assign", eventId, target, role, opts)
}

export function updateEventContact(eventContactId: string, patch: UpdateEventContact): Promise<EventContact> {
  return invokeContactsChannel("event-contacts:patch", eventContactId, patch)
}

export function setPrimaryEventContact(eventContactId: string): Promise<void> {
  return invokeContactsChannel("event-contacts:set-primary", eventContactId)
}

export function reorderEventContacts(eventId: string, role: ContactRoleType, orderedIds: string[]): Promise<void> {
  return invokeContactsChannel("event-contacts:reorder", eventId, role, orderedIds)
}

export function removeEventContact(eventContactId: string): Promise<void> {
  return invokeContactsChannel("event-contacts:delete", eventContactId)
}

export function getContactEventHistory(contactId: string): Promise<ContactEventHistory[]> {
  return invokeContactsChannel("event-contacts:get-by-contact-id", contactId)
}

export function resolveEventRecipients(eventId: string, selection: RecipientSelection): Promise<RecipientResolution> {
  return invokeContactsChannel("event-contacts:resolve-recipients", eventId, selection)
}
