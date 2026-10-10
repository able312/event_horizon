import type { NewVendorCategory, UpdateVendorCategory, VendorCategory } from "~/definitions/contacts"
import { api } from "../../../convex/_generated/api"
import { fetchSource, pickFields, runMutation } from "./backend"
import { toId } from "./ids"
import { sources } from "./sources"

const FIELDS = ["key", "label", "colorToken", "sortOrder"] as const

export function getVendorCategories(options?: { includeArchived?: boolean }): Promise<VendorCategory[]> {
  return fetchSource(sources.vendorCategories.all(options))
}

export function createVendorCategory(input: NewVendorCategory): Promise<VendorCategory> {
  return runMutation(api.vendorCategories.create, { input: pickFields(input, FIELDS) })
}

export function updateVendorCategory(id: string, patch: UpdateVendorCategory): Promise<VendorCategory> {
  return runMutation(api.vendorCategories.update, { id: toId<"vendorCategories">(id), patch: pickFields(patch, FIELDS) })
}

export async function archiveVendorCategory(id: string): Promise<void> {
  await runMutation(api.vendorCategories.archive, { id: toId<"vendorCategories">(id) })
}

export async function restoreVendorCategory(id: string): Promise<void> {
  await runMutation(api.vendorCategories.restore, { id: toId<"vendorCategories">(id) })
}
