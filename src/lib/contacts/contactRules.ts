import type {
  ContactKind,
  ContactRoleType,
  EventContactsPanelGroup,
  EventContactsPanelItem,
  RecipientResolution,
} from "../../definitions/contacts.js"
import { CONTACT_KINDS, CONTACT_ROLE_TYPES } from "../../electron/db/schema.js"
import { ContactsError } from "./contactsError.js"

/** Panel groups always come back in this order, even when empty. */
export const PANEL_ROLE_ORDER: readonly ContactRoleType[] = ["client", "coordinator", "vendor"]

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Trims a text input; blank values become null. */
export function cleanText(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

/** Mirrors the contacts.email_normalized generated column. */
export function normalizeEmail(email: string | null | undefined): string | null {
  return cleanText(email)?.toLowerCase() ?? null
}

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim())
}

export function isContactKind(value: unknown): value is ContactKind {
  return typeof value === "string" && (CONTACT_KINDS as readonly string[]).includes(value)
}

export function isContactRoleType(value: unknown): value is ContactRoleType {
  return typeof value === "string" && (CONTACT_ROLE_TYPES as readonly string[]).includes(value)
}

type NameParts = {
  kind: ContactKind
  firstName: string | null
  lastName: string | null
  organizationName: string | null
}

/** Default display name: "first last" for individuals, organization name for organizations. */
export function deriveDisplayName({ kind, firstName, lastName, organizationName }: NameParts): string | null {
  if (kind === "organization") return cleanText(organizationName)
  return cleanText([firstName, lastName].map(cleanText).filter(Boolean).join(" "))
}

/** First letter of the first and last words; one letter for single-word names; "?" if empty. */
export function deriveInitials(displayName: string | null | undefined): string {
  const words = (displayName ?? "").trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return "?"

  const first = words[0]!.charAt(0)
  const last = words.length > 1 ? words[words.length - 1]!.charAt(0) : ""
  return `${first}${last}`.toUpperCase()
}

/** A vendor category is required for vendors and forbidden for every other role. */
export function assertRoleCategory(role: ContactRoleType, vendorCategoryId: string | null | undefined): void {
  if (!isContactRoleType(role)) {
    throw new ContactsError("InvalidInput", `Unknown contact role: ${String(role)}`)
  }
  if (role === "vendor" && !vendorCategoryId) {
    throw new ContactsError("InvalidRoleCategory", "A vendor category is required for vendors")
  }
  if (role !== "vendor" && vendorCategoryId) {
    throw new ContactsError("InvalidRoleCategory", `A vendor category can't be set for the ${role} role`)
  }
}

/** Buckets already-sorted panel rows into the fixed role order. */
export function groupPanelItems(
  rows: Array<{ role: ContactRoleType; item: EventContactsPanelItem }>,
): EventContactsPanelGroup[] {
  return PANEL_ROLE_ORDER.map((role) => ({
    role,
    items: rows.filter((row) => row.role === role).map((row) => row.item),
  }))
}

type RecipientCandidate = {
  contactId: string
  displayName: string
  email: string | null
}

/**
 * De-duplicates candidates by normalized email, keeping the first occurrence.
 * Contacts without an email are returned separately (once each) so the caller can flag them.
 */
export function buildRecipientResolution(candidates: RecipientCandidate[]): RecipientResolution {
  const seenEmails = new Set<string>()
  const seenSkipped = new Set<string>()
  const resolution: RecipientResolution = { recipients: [], skipped: [] }

  for (const candidate of candidates) {
    const normalized = normalizeEmail(candidate.email)

    if (!normalized) {
      if (seenSkipped.has(candidate.contactId)) continue
      seenSkipped.add(candidate.contactId)
      resolution.skipped.push({ contactId: candidate.contactId, displayName: candidate.displayName })
      continue
    }

    if (seenEmails.has(normalized)) continue
    seenEmails.add(normalized)
    resolution.recipients.push({
      contactId: candidate.contactId,
      displayName: candidate.displayName,
      email: candidate.email!.trim(),
    })
  }

  return resolution
}
