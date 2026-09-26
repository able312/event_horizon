import type { NewVendorCategory, UpdateVendorCategory, VendorCategory } from "~/definitions/contacts"
import { invokeContactsChannel } from "./contactsIpcResult"

export function getVendorCategories(options?: { includeArchived?: boolean }): Promise<VendorCategory[]> {
  return invokeContactsChannel("vendor-categories:get-many", options)
}

export function createVendorCategory(input: NewVendorCategory): Promise<VendorCategory> {
  return invokeContactsChannel("vendor-categories:post", input)
}

export function updateVendorCategory(id: string, patch: UpdateVendorCategory): Promise<VendorCategory> {
  return invokeContactsChannel("vendor-categories:patch", id, patch)
}

export function archiveVendorCategory(id: string): Promise<void> {
  return invokeContactsChannel("vendor-categories:archive", id)
}

export function restoreVendorCategory(id: string): Promise<void> {
  return invokeContactsChannel("vendor-categories:restore", id)
}
