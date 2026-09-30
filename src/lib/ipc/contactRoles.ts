import type { ContactRole, ContactRoleType } from "~/definitions/contacts"
import { invokeContactsChannel } from "./contactsIpcResult"

export function getContactRoles(contactId: string): Promise<ContactRole[]> {
  return invokeContactsChannel("contact-roles:get-by-contact-id", contactId)
}

export function ensureContactRole(
  contactId: string,
  role: ContactRoleType,
  vendorCategoryId?: string | null,
): Promise<ContactRole> {
  return invokeContactsChannel("contact-roles:ensure", contactId, role, vendorCategoryId)
}

export function removeContactRole(
  contactId: string,
  role: ContactRoleType,
  vendorCategoryId?: string | null,
): Promise<void> {
  return invokeContactsChannel("contact-roles:delete", contactId, role, vendorCategoryId)
}
