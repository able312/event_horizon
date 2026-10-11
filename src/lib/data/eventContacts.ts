import type {
  AssignContactTarget,
  AssignEventContactOptions,
  ContactEventHistory,
  ContactRoleType,
  EventContact,
  EventContactsPanel,
  PrimaryClient,
  RecipientResolution,
  RecipientSelection,
  UpdateContact,
  UpdateEventContact,
} from "~/definitions/contacts"
import { api } from "../../../convex/_generated/api"
import { fetchSource, pickFields, runMutation, runQuery } from "./backend"
import { CONTACT_FIELDS } from "./contacts"
import { toId, toIds } from "./ids"
import { sources } from "./sources"

// Expected failures reject with a ContactsError; see translateBackendError.

function toAssignmentFields(patch: UpdateEventContact) {
  const { vendorCategoryId, ...rest } = pickFields(patch, ["vendorCategoryId", "roleLabel", "isPrimary", "notes"])
  return {
    ...rest,
    ...(vendorCategoryId !== undefined
      ? { vendorCategoryId: vendorCategoryId ? toId<"vendorCategories">(vendorCategoryId) : null }
      : {}),
  }
}

export function getEventContactsPanel(eventId: string): Promise<EventContactsPanel> {
  return fetchSource(sources.eventContacts.panel(eventId))
}

export function getPrimaryClients(eventIds: string[]): Promise<Record<string, PrimaryClient>> {
  return fetchSource(sources.eventContacts.primaryClients(eventIds))
}

export function assignEventContact(
  eventId: string,
  target: AssignContactTarget,
  role: ContactRoleType,
  opts?: AssignEventContactOptions,
): Promise<EventContact> {
  return runMutation(api.eventContacts.assign, {
    eventId: toId<"events">(eventId),
    target: "contactId" in target
      ? { contactId: toId<"contacts">(target.contactId) }
      : { newContact: pickFields(target.newContact, CONTACT_FIELDS) },
    role,
    ...(opts ? { opts: toAssignmentFields(opts) } : {}),
  })
}

export function updateEventContact(eventContactId: string, patch: UpdateEventContact): Promise<EventContact> {
  return runMutation(api.eventContacts.update, {
    id: toId<"eventContacts">(eventContactId),
    patch: toAssignmentFields(patch),
  })
}

/** Updates the contact's shared details and the assignment in one transaction. */
export function updateEventContactWithContact(
  eventContactId: string,
  contactPatch: UpdateContact,
  assignmentPatch: UpdateEventContact,
): Promise<EventContact> {
  return runMutation(api.eventContacts.updateWithContact, {
    id: toId<"eventContacts">(eventContactId),
    contactPatch: pickFields(contactPatch, CONTACT_FIELDS),
    assignmentPatch: toAssignmentFields(assignmentPatch),
  })
}

export async function setPrimaryEventContact(eventContactId: string): Promise<void> {
  await runMutation(api.eventContacts.setPrimary, { id: toId<"eventContacts">(eventContactId) })
}

export async function reorderEventContacts(eventId: string, role: ContactRoleType, orderedIds: string[]): Promise<void> {
  await runMutation(api.eventContacts.reorder, {
    eventId: toId<"events">(eventId),
    role,
    orderedIds: toIds<"eventContacts">(orderedIds),
  })
}

export async function removeEventContact(eventContactId: string): Promise<void> {
  await runMutation(api.eventContacts.remove, { id: toId<"eventContacts">(eventContactId) })
}

export function getContactEventHistory(contactId: string): Promise<ContactEventHistory[]> {
  return fetchSource(sources.eventContacts.history(contactId))
}

export function resolveEventRecipients(eventId: string, selection: RecipientSelection): Promise<RecipientResolution> {
  return runQuery(api.eventContacts.resolveRecipients, {
    eventId: toId<"events">(eventId),
    selection: "eventContactIds" in selection
      ? { eventContactIds: toIds<"eventContacts">(selection.eventContactIds) }
      : {
          roles: selection.roles,
          ...(selection.vendorCategoryIds ? { vendorCategoryIds: toIds<"vendorCategories">(selection.vendorCategoryIds) } : {}),
        },
  })
}
