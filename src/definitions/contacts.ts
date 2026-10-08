import type { EventStatus } from "./database.js"
import type { CONTACT_KINDS, CONTACT_ROLE_TYPES } from "./enums.js"

// ============================================================================
// Contacts (identity)
// ============================================================================

export type ContactKind = (typeof CONTACT_KINDS)[number]
export type ContactRoleType = (typeof CONTACT_ROLE_TYPES)[number]

export type Contact = {
  id: string
  kind: ContactKind
  firstName: string | null
  lastName: string | null
  organizationName: string | null
  /** Stored so people and companies sort and search the same way. */
  displayName: string
  /** Original casing, for display. */
  email: string | null
  /** Lowercased, trimmed email used for matching and uniqueness. */
  emailNormalized: string | null
  phone: string | null
  notes: string | null
  /** ISO datetime; archived contacts can't be newly assigned. */
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

/** Fields the renderer may set when creating a contact. displayName is derived when omitted. */
export type NewContact = {
  kind?: ContactKind
  firstName?: string | null
  lastName?: string | null
  organizationName?: string | null
  displayName?: string | null
  email?: string | null
  phone?: string | null
  notes?: string | null
}
export type UpdateContact = Partial<NewContact>

export type VendorCategorySummary = {
  id: string
  label: string
  colorToken: string
}

export type ContactRoleSummary = {
  id: string
  role: ContactRoleType
  vendorCategory: VendorCategorySummary | null
}

export type ContactWithRoles = Contact & {
  roles: ContactRoleSummary[]
}

export type ContactSearchRequest = {
  query?: string
  role?: ContactRoleType
  vendorCategoryId?: string
  includeArchived?: boolean
  limit: number
  cursor?: string | null
}

export type Page<T> = {
  items: T[]
  nextCursor: string | null
}

// ============================================================================
// Standing roles & vendor categories
// ============================================================================

export type ContactRole = {
  id: string
  contactId: string
  role: ContactRoleType
  /** Required for vendors, null for other roles. */
  vendorCategoryId: string | null
  createdAt: string
}

export type VendorCategory = {
  id: string
  /** e.g. 'catering'; immutable once used. */
  key: string
  label: string
  colorToken: string
  sortOrder: number
  /** Hidden from pickers; existing assignments keep it. */
  archivedAt: string | null
}
export type NewVendorCategory = {
  key: string
  label: string
  colorToken: string
  sortOrder?: number
}
export type UpdateVendorCategory = Partial<NewVendorCategory>

// ============================================================================
// Event assignments
// ============================================================================

export type EventContact = {
  id: string
  eventId: string
  contactId: string
  role: ContactRoleType
  /** Required for vendors, null for other roles. */
  vendorCategoryId: string | null
  isPrimary: boolean
  /** e.g. 'Lead coordinator', 'Bride's father' */
  roleLabel: string | null
  notes: string | null
  sortOrder: number
  /** Soft remove */
  removedAt: string | null
  createdAt: string
  updatedAt: string
}

/** Assign an existing contact by id, or create one inline. */
export type AssignContactTarget = { contactId: string } | { newContact: NewContact }

export type AssignEventContactOptions = {
  vendorCategoryId?: string | null
  roleLabel?: string | null
  isPrimary?: boolean
  notes?: string | null
}

export type UpdateEventContact = {
  vendorCategoryId?: string | null
  roleLabel?: string | null
  isPrimary?: boolean
  notes?: string | null
}

export type EventContactsPanelItem = {
  eventContactId: string
  contactId: string
  displayName: string
  initials: string
  email: string | null
  phone: string | null
  roleLabel: string | null
  /** Event-specific notes, e.g. a vendor's arrival time. */
  notes: string | null
  vendorCategory: VendorCategorySummary | null
  isPrimary: boolean
  contactArchived: boolean
}

export type EventContactsPanelGroup = {
  role: ContactRoleType
  items: EventContactsPanelItem[]
}

export type EventContactsPanel = {
  eventId: string
  /** Fixed order: client, coordinator, vendor; empty groups included. */
  groups: EventContactsPanelGroup[]
}

/**
 * The client shown on documents, lists and calendar exports:
 * the primary client, or the first client in panel order when none is marked primary.
 */
export type PrimaryClient = Pick<EventContactsPanelItem, "contactId" | "displayName" | "email" | "phone">

export type ContactEventHistory = {
  eventContactId: string
  eventId: string
  eventTitle: string
  eventStatus: EventStatus
  eventStartDateTime: string | null
  role: ContactRoleType
  vendorCategory: VendorCategorySummary | null
  roleLabel: string | null
  isPrimary: boolean
  removedAt: string | null
}

// ============================================================================
// Recipient resolution
// ============================================================================

export type RecipientSelection =
  | { eventContactIds: string[] }
  | { roles: ContactRoleType[]; vendorCategoryIds?: string[] }

export type Recipient = {
  contactId: string
  displayName: string
  email: string
}

export type SkippedRecipient = {
  contactId: string
  displayName: string
}

export type RecipientResolution = {
  recipients: Recipient[]
  /** Selected contacts with no email address. */
  skipped: SkippedRecipient[]
}

// ============================================================================
// Errors
// ============================================================================

export type ContactsErrorCode =
  | "NotFound"
  | "EmailTaken"
  | "InvalidRoleCategory"
  | "ContactArchived"
  | "DuplicateAssignment"
  | "ContactInUse"
  | "InvalidInput"

/** Serializable form of a ContactsError, sent across IPC. */
export type ContactsErrorPayload = {
  code: ContactsErrorCode
  message: string
  /** Set for EmailTaken so the caller can offer "use existing". */
  existingContactId?: string
}
