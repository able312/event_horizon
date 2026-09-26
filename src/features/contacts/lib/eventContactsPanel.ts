import type {
  ContactRoleType,
  ContactWithRoles,
  EventContactsPanel,
  EventContactsPanelItem,
} from "~/definitions/contacts"
import { isContactsError } from "~/lib/contacts/contactsError"

export const ROLE_LABELS: Record<ContactRoleType, { singular: string; plural: string }> = {
  client: { singular: "Client", plural: "Clients" },
  coordinator: { singular: "Coordinator", plural: "Coordinators" },
  vendor: { singular: "Vendor", plural: "Vendors" },
}

export function getPanelItems(panel: EventContactsPanel | undefined): EventContactsPanelItem[] {
  return panel?.groups.flatMap((group) => group.items) ?? []
}

/** Drops selected ids that are no longer on the panel (e.g. after a contact is removed). */
export function pruneSelection(selectedIds: ReadonlySet<string>, panel: EventContactsPanel | undefined): Set<string> {
  const panelIds = new Set(getPanelItems(panel).map((item) => item.eventContactId))
  return new Set([...selectedIds].filter((id) => panelIds.has(id)))
}

/** Adds every id in the group when any are unselected; otherwise clears the group. */
export function toggleGroupSelection(selectedIds: ReadonlySet<string>, groupIds: string[]): Set<string> {
  const next = new Set(selectedIds)
  const allSelected = groupIds.length > 0 && groupIds.every((id) => next.has(id))
  for (const id of groupIds) {
    if (allSelected) next.delete(id)
    else next.add(id)
  }
  return next
}

export function toggleId(selectedIds: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(selectedIds)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}

/**
 * True when the contact is already assigned to this event in the chosen role
 * (and, for vendors, the chosen category) — the back end would reject it as a duplicate.
 */
export function isAlreadyAssigned(
  panel: EventContactsPanel | undefined,
  contactId: string,
  role: ContactRoleType,
  vendorCategoryId: string | null,
): boolean {
  const group = panel?.groups.find((g) => g.role === role)
  if (!group) return false
  return group.items.some(
    (item) =>
      item.contactId === contactId && (role !== "vendor" || (item.vendorCategory?.id ?? null) === vendorCategoryId),
  )
}

/** Short summary of a directory contact's standing roles, e.g. "Client · Catering vendor". */
export function describeStandingRoles(contact: ContactWithRoles): string {
  return contact.roles
    .map((role) =>
      role.role === "vendor" && role.vendorCategory
        ? `${role.vendorCategory.label} vendor`
        : ROLE_LABELS[role.role].singular,
    )
    .join(" · ")
}

export function getContactsErrorMessage(err: unknown, fallback: string): string {
  if (isContactsError(err)) return err.message
  return fallback
}

/** Secondary line under a contact's name: the role label, falling back to the role itself. */
export function describeAssignment(role: ContactRoleType, item: EventContactsPanelItem): string {
  return item.roleLabel ?? ROLE_LABELS[role].singular
}

/** Plain-text contact card for pasting into emails or notes. */
export function formatContactPlainText(role: ContactRoleType, item: EventContactsPanelItem): string {
  const category = role === "vendor" && item.vendorCategory ? ` (${item.vendorCategory.label})` : ""
  const lines = [`${item.displayName} · ${describeAssignment(role, item)}${category}`]
  if (item.email) lines.push(`Email: ${item.email}`)
  if (item.phone) lines.push(`Phone: ${item.phone}`)
  return lines.join("\n")
}
