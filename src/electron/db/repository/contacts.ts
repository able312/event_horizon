import { and, asc, eq, exists, inArray, isNull, ne, or, sql, type SQL } from "drizzle-orm"
import { v4 as uuidv4 } from "uuid"

import type {
  Contact,
  ContactKind,
  ContactRoleSummary,
  ContactSearchRequest,
  ContactWithRoles,
  NewContact,
  Page,
  UpdateContact,
} from "../../../definitions/contacts.js"
import {
  cleanText,
  deriveDisplayName,
  isContactKind,
  isContactRoleType,
  isValidEmail,
  normalizeEmail,
} from "../../../lib/contacts/contactRules.js"
import { ContactsError } from "../../../lib/contacts/contactsError.js"
import type { DbExecutor } from "../factory.js"
import { db } from "../index.js"
import { contactRoles, contacts, eventContacts, vendorCategories } from "../schema.js"

const MAX_SEARCH_LIMIT = 100

type ContactFields = Pick<
  Contact,
  "kind" | "firstName" | "lastName" | "organizationName" | "displayName" | "email" | "phone" | "notes"
>

/** Trims every field, validates kind and email, and fills in the default display name. */
function buildContactFields(input: NewContact & { kind: ContactKind }): ContactFields {
  if (!isContactKind(input.kind)) {
    throw new ContactsError("InvalidInput", `Unknown contact kind: ${String(input.kind)}`)
  }

  const nameParts = {
    kind: input.kind,
    firstName: cleanText(input.firstName),
    lastName: cleanText(input.lastName),
    organizationName: cleanText(input.organizationName),
  }
  const displayName = cleanText(input.displayName) ?? deriveDisplayName(nameParts)
  if (!displayName) throw new ContactsError("InvalidInput", "Display name is required")

  const email = cleanText(input.email)
  if (email && !isValidEmail(email)) {
    throw new ContactsError("InvalidInput", `"${email}" is not a valid email address`)
  }

  return {
    ...nameParts,
    displayName,
    email,
    phone: cleanText(input.phone),
    notes: cleanText(input.notes),
  }
}

/** Offset cursor; kept opaque to callers so the paging strategy can change later. */
function parseCursor(cursor: string | null | undefined): number {
  if (!cursor) return 0
  const offset = Number(cursor)
  if (!Number.isInteger(offset) || offset < 0) throw new ContactsError("InvalidInput", "Invalid search cursor")
  return offset
}

function escapeLike(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_")
}

export function createContactsRepository(database: DbExecutor) {
  const repo = {
    /** Includes archived contacts. */
    getById: (id: string): Contact | null => {
      return database.select().from(contacts).where(eq(contacts.id, id)).get() ?? null
    },

    requireById: (id: string): Contact => {
      const contact = repo.getById(id)
      if (!contact) throw new ContactsError("NotFound", `Contact not found for id ${id}`)
      return contact
    },

    /** Matches on normalized email; active contacts only. */
    findByEmail: (email: string): Contact | null => {
      const normalized = normalizeEmail(email)
      if (!normalized) return null

      return (
        database
          .select()
          .from(contacts)
          .where(and(eq(contacts.emailNormalized, normalized), isNull(contacts.archivedAt)))
          .get() ?? null
      )
    },

    /** Throws EmailTaken (with the existing id) if another active contact uses this email. */
    assertEmailAvailable: (email: string | null, excludeContactId?: string): void => {
      if (!email) return
      const existing = repo.findByEmail(email)
      if (existing && existing.id !== excludeContactId) {
        throw new ContactsError("EmailTaken", `${email} already belongs to ${existing.displayName}`, existing.id)
      }
    },

    create: (input: NewContact): Contact => {
      const fields = buildContactFields({ ...input, kind: input.kind ?? "individual" })
      repo.assertEmailAvailable(fields.email)

      const now = new Date().toISOString()
      return database
        .insert(contacts)
        .values({ id: uuidv4(), ...fields, createdAt: now, updatedAt: now })
        .returning()
        .get()
    },

    /** Directory search. Role and category filters match standing roles. */
    search: (params: ContactSearchRequest): Page<ContactWithRoles> => {
      const limit = Math.min(MAX_SEARCH_LIMIT, Math.max(1, Math.floor(params.limit)))
      const offset = parseCursor(params.cursor)
      const whereClauses: Array<SQL | undefined> = []

      if (!params.includeArchived) whereClauses.push(isNull(contacts.archivedAt))

      const query = cleanText(params.query)?.toLowerCase()
      if (query) {
        const pattern = `%${escapeLike(query)}%`
        const contains = (column: SQL) => sql`${column} like ${pattern} escape '\\'`
        whereClauses.push(
          or(
            contains(sql`lower(${contacts.displayName})`),
            contains(sql`lower(coalesce(${contacts.organizationName}, ''))`),
            contains(sql`coalesce(${contacts.emailNormalized}, '')`),
            contains(sql`coalesce(${contacts.phone}, '')`),
          ),
        )
      }

      if (params.role !== undefined && !isContactRoleType(params.role)) {
        throw new ContactsError("InvalidInput", `Unknown contact role: ${String(params.role)}`)
      }
      // A category filter implies the vendor role
      const role = params.role ?? (params.vendorCategoryId ? "vendor" : undefined)
      if (role) {
        whereClauses.push(
          exists(
            database
              .select({ id: contactRoles.id })
              .from(contactRoles)
              .where(
                and(
                  eq(contactRoles.contactId, contacts.id),
                  eq(contactRoles.role, role),
                  params.vendorCategoryId ? eq(contactRoles.vendorCategoryId, params.vendorCategoryId) : undefined,
                ),
              ),
          ),
        )
      }

      const rows = database
        .select()
        .from(contacts)
        .where(and(...whereClauses))
        .orderBy(asc(sql`lower(${contacts.displayName})`), asc(contacts.id))
        .limit(limit + 1)
        .offset(offset)
        .all()

      const hasMore = rows.length > limit
      const pageRows = hasMore ? rows.slice(0, limit) : rows
      const rolesByContact = repo.listRoleSummaries(pageRows.map((row) => row.id))

      return {
        items: pageRows.map((row) => ({ ...row, roles: rolesByContact.get(row.id) ?? [] })),
        nextCursor: hasMore ? String(offset + limit) : null,
      }
    },

    listRoleSummaries: (contactIds: string[]): Map<string, ContactRoleSummary[]> => {
      const byContact = new Map<string, ContactRoleSummary[]>()
      if (contactIds.length === 0) return byContact

      const rows = database
        .select({
          id: contactRoles.id,
          contactId: contactRoles.contactId,
          role: contactRoles.role,
          categoryId: vendorCategories.id,
          categoryLabel: vendorCategories.label,
          categoryColor: vendorCategories.colorToken,
        })
        .from(contactRoles)
        .leftJoin(vendorCategories, eq(contactRoles.vendorCategoryId, vendorCategories.id))
        .where(inArray(contactRoles.contactId, contactIds))
        .orderBy(asc(contactRoles.role), asc(vendorCategories.sortOrder))
        .all()

      for (const row of rows) {
        const list = byContact.get(row.contactId) ?? []
        list.push({
          id: row.id,
          role: row.role,
          vendorCategory:
            row.categoryId && row.categoryLabel && row.categoryColor
              ? { id: row.categoryId, label: row.categoryLabel, colorToken: row.categoryColor }
              : null,
        })
        byContact.set(row.contactId, list)
      }
      return byContact
    },

    update: (id: string, patch: UpdateContact): Contact => {
      const existing = repo.requireById(id)

      const pick = <K extends keyof NewContact>(key: K) => (patch[key] !== undefined ? patch[key] : existing[key])
      const nameChanged = (["kind", "firstName", "lastName", "organizationName"] as const).some(
        (key) => patch[key] !== undefined,
      )
      // Only re-derive the display name if the user never customised it
      const displayNameWasDefault = existing.displayName === deriveDisplayName(existing)
      const displayName =
        patch.displayName !== undefined
          ? patch.displayName
          : nameChanged && displayNameWasDefault
            ? null
            : existing.displayName

      const fields = buildContactFields({
        kind: pick("kind") ?? existing.kind,
        firstName: pick("firstName"),
        lastName: pick("lastName"),
        organizationName: pick("organizationName"),
        displayName,
        email: pick("email"),
        phone: pick("phone"),
        notes: pick("notes"),
      })

      if (!existing.archivedAt && normalizeEmail(fields.email) !== existing.emailNormalized) {
        repo.assertEmailAvailable(fields.email, id)
      }

      return database
        .update(contacts)
        .set({ ...fields, updatedAt: new Date().toISOString() })
        .where(eq(contacts.id, id))
        .returning()
        .get()!
    },

    /** Archived contacts stay on past events but can't be newly assigned. */
    archive: (id: string): void => {
      const existing = repo.requireById(id)
      if (existing.archivedAt) return

      const now = new Date().toISOString()
      database.update(contacts).set({ archivedAt: now, updatedAt: now }).where(eq(contacts.id, id)).run()
    },

    restore: (id: string): void => {
      const existing = repo.requireById(id)
      if (!existing.archivedAt) return

      // Another active contact may have taken this email while it was archived
      repo.assertEmailAvailable(existing.email, id)
      database
        .update(contacts)
        .set({ archivedAt: null, updatedAt: new Date().toISOString() })
        .where(eq(contacts.id, id))
        .run()
    },

    /** Hard delete, only for contacts that have never been assigned to an event. */
    delete: (id: string): void => {
      repo.requireById(id)
      const assignment = database
        .select({ id: eventContacts.id })
        .from(eventContacts)
        .where(eq(eventContacts.contactId, id))
        .limit(1)
        .get()
      if (assignment) {
        throw new ContactsError("ContactInUse", "This contact has event history; archive it instead")
      }
      database.delete(contacts).where(eq(contacts.id, id)).run()
    },

    /**
     * Folds a duplicate record into the target: moves standing roles and event assignments,
     * drops assignments the target already has, archives the source, and copies over any
     * email/phone/notes the target is missing.
     */
    merge: (sourceId: string, targetId: string): Contact => {
      if (sourceId === targetId) throw new ContactsError("InvalidInput", "Can't merge a contact into itself")

      return database.transaction((tx) => {
        const txRepo = createContactsRepository(tx)
        const source = txRepo.requireById(sourceId)
        const target = txRepo.requireById(targetId)
        if (target.archivedAt) {
          throw new ContactsError("ContactArchived", `${target.displayName} is archived; restore it before merging`)
        }

        mergeStandingRoles(tx, sourceId, targetId)
        mergeAssignments(tx, sourceId, targetId)

        const now = new Date().toISOString()
        tx.update(contacts).set({ archivedAt: source.archivedAt ?? now, updatedAt: now }).where(eq(contacts.id, sourceId)).run()

        const fill: Partial<Pick<Contact, "email" | "phone" | "notes">> = {}
        if (!target.email && source.email && !txRepo.findByEmail(source.email)) fill.email = source.email
        if (!target.phone && source.phone) fill.phone = source.phone
        if (!target.notes && source.notes) fill.notes = source.notes

        return tx
          .update(contacts)
          .set({ ...fill, updatedAt: now })
          .where(eq(contacts.id, targetId))
          .returning()
          .get()!
      })
    },
  }

  return repo
}

function mergeStandingRoles(tx: DbExecutor, sourceId: string, targetId: string): void {
  const sourceRoles = tx.select().from(contactRoles).where(eq(contactRoles.contactId, sourceId)).all()
  for (const role of sourceRoles) {
    tx.insert(contactRoles)
      .values({ ...role, id: uuidv4(), contactId: targetId })
      .onConflictDoNothing()
      .run()
  }
  tx.delete(contactRoles).where(eq(contactRoles.contactId, sourceId)).run()
}

function mergeAssignments(tx: DbExecutor, sourceId: string, targetId: string): void {
  const now = new Date().toISOString()
  const sourceRows = tx.select().from(eventContacts).where(eq(eventContacts.contactId, sourceId)).all()

  for (const row of sourceRows) {
    const duplicate = row.removedAt
      ? undefined
      : tx
          .select()
          .from(eventContacts)
          .where(
            and(
              eq(eventContacts.eventId, row.eventId),
              eq(eventContacts.contactId, targetId),
              eq(eventContacts.role, row.role),
              row.vendorCategoryId
                ? eq(eventContacts.vendorCategoryId, row.vendorCategoryId)
                : isNull(eventContacts.vendorCategoryId),
              isNull(eventContacts.removedAt),
              ne(eventContacts.id, row.id),
            ),
          )
          .get()

    if (duplicate) {
      tx.update(eventContacts)
        .set({
          isPrimary: duplicate.isPrimary || row.isPrimary,
          roleLabel: duplicate.roleLabel ?? row.roleLabel,
          notes: duplicate.notes ?? row.notes,
          updatedAt: now,
        })
        .where(eq(eventContacts.id, duplicate.id))
        .run()
      tx.delete(eventContacts).where(eq(eventContacts.id, row.id)).run()
    } else {
      tx.update(eventContacts).set({ contactId: targetId, updatedAt: now }).where(eq(eventContacts.id, row.id)).run()
    }
  }
}

const contactQueries = createContactsRepository(db)

export default contactQueries
