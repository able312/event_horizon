import type { ContactRole, ContactRoleType } from "~/definitions/contacts"
import { api } from "../../../convex/_generated/api"
import { fetchSource, runMutation } from "./backend"
import { toId } from "./ids"
import { sources } from "./sources"

export function getContactRoles(contactId: string): Promise<ContactRole[]> {
  return fetchSource(sources.contacts.roles(contactId))
}

export function ensureContactRole(
  contactId: string,
  role: ContactRoleType,
  vendorCategoryId?: string | null,
): Promise<ContactRole> {
  return runMutation(api.contactRoles.ensure, {
    contactId: toId<"contacts">(contactId),
    role,
    vendorCategoryId: vendorCategoryId ? toId<"vendorCategories">(vendorCategoryId) : null,
  })
}

export async function removeContactRole(
  contactId: string,
  role: ContactRoleType,
  vendorCategoryId?: string | null,
): Promise<void> {
  await runMutation(api.contactRoles.remove, {
    contactId: toId<"contacts">(contactId),
    role,
    vendorCategoryId: vendorCategoryId ? toId<"vendorCategories">(vendorCategoryId) : null,
  })
}
