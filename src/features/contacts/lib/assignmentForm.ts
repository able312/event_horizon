import type {
  AssignEventContactOptions,
  ContactRoleType,
  EventContactsPanelItem,
  UpdateEventContact,
} from "~/definitions/contacts"
import { cleanText } from "~/lib/contacts/contactRules"

/** Controlled-input state for the event-specific part of an assignment. */
export type AssignmentValues = {
  role: ContactRoleType
  vendorCategoryId: string | null
  roleLabel: string
  notes: string
}

export const DEFAULT_ASSIGNMENT: AssignmentValues = {
  role: "client",
  vendorCategoryId: null,
  roleLabel: "",
  notes: "",
}

export function assignmentFromPanelItem(role: ContactRoleType, item: EventContactsPanelItem): AssignmentValues {
  return {
    role,
    vendorCategoryId: item.vendorCategory?.id ?? null,
    roleLabel: item.roleLabel ?? "",
    notes: item.notes ?? "",
  }
}

/** Mirrors the back-end rule so the user sees the problem before submitting. */
export function getAssignmentError(values: AssignmentValues): string | undefined {
  if (values.role === "vendor" && !values.vendorCategoryId) return "Pick a vendor category"
  return undefined
}

export function toAssignOptions(values: AssignmentValues): AssignEventContactOptions {
  return {
    vendorCategoryId: values.role === "vendor" ? values.vendorCategoryId : null,
    roleLabel: cleanText(values.roleLabel),
    notes: cleanText(values.notes),
  }
}

export function toAssignmentPatch(values: AssignmentValues): UpdateEventContact {
  const patch = { roleLabel: cleanText(values.roleLabel), notes: cleanText(values.notes) }
  return values.role === "vendor" ? { vendorCategoryId: values.vendorCategoryId, ...patch } : patch
}
