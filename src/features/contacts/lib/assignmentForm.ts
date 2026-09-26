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
}

export const DEFAULT_ASSIGNMENT: AssignmentValues = {
  role: "client",
  vendorCategoryId: null,
  roleLabel: "",
}

export function assignmentFromPanelItem(role: ContactRoleType, item: EventContactsPanelItem): AssignmentValues {
  return {
    role,
    vendorCategoryId: item.vendorCategory?.id ?? null,
    roleLabel: item.roleLabel ?? "",
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
  }
}

export function toAssignmentPatch(values: AssignmentValues): UpdateEventContact {
  return values.role === "vendor"
    ? { vendorCategoryId: values.vendorCategoryId, roleLabel: cleanText(values.roleLabel) }
    : { roleLabel: cleanText(values.roleLabel) }
}
