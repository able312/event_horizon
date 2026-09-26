import { and, asc, desc, eq, inArray, isNull, ne, or, sql, type SQL } from "drizzle-orm"
import { v4 as uuidv4 } from "uuid"

import type {
  AssignContactTarget,
  AssignEventContactOptions,
  ContactEventHistory,
  ContactRoleType,
  EventContact,
  EventContactsPanel,
  EventContactsPanelItem,
  RecipientResolution,
  RecipientSelection,
  UpdateEventContact,
  VendorCategorySummary,
} from "../../../definitions/contacts.js"
import {
  assertRoleCategory,
  buildRecipientResolution,
  cleanText,
  deriveInitials,
  groupPanelItems,
  isContactRoleType,
} from "../../../lib/contacts/contactRules.js"
import { ContactsError } from "../../../lib/contacts/contactsError.js"
import type { DbExecutor } from "../factory.js"
import { db } from "../index.js"
import { contacts, eventContacts, events, vendorCategories } from "../schema.js"
import { createContactRolesRepository } from "./contactRoles.js"
import { createContactsRepository } from "./contacts.js"
import { createVendorCategoriesRepository } from "./vendorCategories.js"

function requireEvent(database: DbExecutor, eventId: string): void {
  const event = database.select({ id: events.id }).from(events).where(eq(events.id, eventId)).get()
  if (!event) throw new ContactsError("NotFound", `Event not found for id ${eventId}`)
}

function requireActiveEventContact(database: DbExecutor, eventContactId: string): EventContact {
  const row = database.select().from(eventContacts).where(eq(eventContacts.id, eventContactId)).get()
  if (!row) throw new ContactsError("NotFound", `Event contact not found for id ${eventContactId}`)
  if (row.removedAt) throw new ContactsError("InvalidInput", "This contact has been removed from the event")
  return row
}

function matchesCategory(vendorCategoryId: string | null): SQL {
  return vendorCategoryId ? eq(eventContacts.vendorCategoryId, vendorCategoryId) : isNull(eventContacts.vendorCategoryId)
}

function toCategorySummary(
  id: string | null,
  label: string | null,
  colorToken: string | null,
): VendorCategorySummary | null {
  return id && label && colorToken ? { id, label, colorToken } : null
}

/**
 * Active assignments for one event in panel order:
 * role group, primary first, then sort_order, vendor category order, display name.
 */
function selectPanelRows(database: DbExecutor, eventId: string, filter?: SQL) {
  return database
    .select({
      eventContactId: eventContacts.id,
      contactId: contacts.id,
      role: eventContacts.role,
      displayName: contacts.displayName,
      email: contacts.email,
      phone: contacts.phone,
      roleLabel: eventContacts.roleLabel,
      isPrimary: eventContacts.isPrimary,
      contactArchivedAt: contacts.archivedAt,
      categoryId: vendorCategories.id,
      categoryLabel: vendorCategories.label,
      categoryColor: vendorCategories.colorToken,
    })
    .from(eventContacts)
    .innerJoin(contacts, eq(eventContacts.contactId, contacts.id))
    .leftJoin(vendorCategories, eq(eventContacts.vendorCategoryId, vendorCategories.id))
    .where(and(eq(eventContacts.eventId, eventId), isNull(eventContacts.removedAt), filter))
    .orderBy(
      sql`case ${eventContacts.role} when 'client' then 0 when 'coordinator' then 1 else 2 end`,
      desc(eventContacts.isPrimary),
      asc(eventContacts.sortOrder),
      asc(sql`coalesce(${vendorCategories.sortOrder}, 0)`),
      asc(sql`lower(${contacts.displayName})`),
    )
    .all()
}

function nextSortOrder(database: DbExecutor, eventId: string, role: ContactRoleType): number {
  const result = database
    .select({ max: sql<number | null>`max(${eventContacts.sortOrder})` })
    .from(eventContacts)
    .where(and(eq(eventContacts.eventId, eventId), eq(eventContacts.role, role), isNull(eventContacts.removedAt)))
    .get()
  return result?.max == null ? 0 : result.max + 1
}

/** Makes one assignment the primary for its event and role, clearing any other. */
function markPrimary(database: DbExecutor, row: EventContact): void {
  const now = new Date().toISOString()
  database
    .update(eventContacts)
    .set({ isPrimary: false, updatedAt: now })
    .where(
      and(
        eq(eventContacts.eventId, row.eventId),
        eq(eventContacts.role, row.role),
        eq(eventContacts.isPrimary, true),
        ne(eventContacts.id, row.id),
      ),
    )
    .run()
  database.update(eventContacts).set({ isPrimary: true, updatedAt: now }).where(eq(eventContacts.id, row.id)).run()
}

function requireStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new ContactsError("InvalidInput", `${field} must be an array of ids`)
  }
  return value
}

/** Assignments: what a contact is doing on one specific event. The event panel reads only these. */
export function createEventContactsRepository(database: DbExecutor) {
  const repo = {
    getPanel: (eventId: string): EventContactsPanel => {
      requireEvent(database, eventId)

      const rows = selectPanelRows(database, eventId).map((row) => ({
        role: row.role,
        item: {
          eventContactId: row.eventContactId,
          contactId: row.contactId,
          displayName: row.displayName,
          initials: deriveInitials(row.displayName),
          email: row.email,
          phone: row.phone,
          roleLabel: row.roleLabel,
          vendorCategory: toCategorySummary(row.categoryId, row.categoryLabel, row.categoryColor),
          isPrimary: row.isPrimary,
          contactArchived: row.contactArchivedAt !== null,
        } satisfies EventContactsPanelItem,
      }))

      return { eventId, groups: groupPanelItems(rows) }
    },

    /**
     * Adds a contact (existing or new) to an event. Also records the matching standing role,
     * and re-activates a previously removed assignment instead of duplicating it.
     */
    assign: (
      eventId: string,
      target: AssignContactTarget,
      role: ContactRoleType,
      opts: AssignEventContactOptions = {},
    ): EventContact => {
      const vendorCategoryId = opts.vendorCategoryId ?? null
      assertRoleCategory(role, vendorCategoryId)

      return database.transaction((tx) => {
        requireEvent(tx, eventId)
        if (vendorCategoryId) createVendorCategoriesRepository(tx).requireSelectable(vendorCategoryId)

        const contactsRepo = createContactsRepository(tx)
        let contact
        const isObject = typeof target === "object" && target !== null
        if (isObject && "contactId" in target) contact = contactsRepo.requireById(target.contactId)
        else if (isObject && "newContact" in target) contact = contactsRepo.create(target.newContact)
        else throw new ContactsError("InvalidInput", "Provide either contactId or newContact")

        if (contact.archivedAt) {
          throw new ContactsError("ContactArchived", `${contact.displayName} is archived and can't be assigned`)
        }

        createContactRolesRepository(tx).ensure(contact.id, role, vendorCategoryId)

        const previous = tx
          .select()
          .from(eventContacts)
          .where(
            and(
              eq(eventContacts.eventId, eventId),
              eq(eventContacts.contactId, contact.id),
              eq(eventContacts.role, role),
              matchesCategory(vendorCategoryId),
            ),
          )
          .orderBy(sql`${eventContacts.removedAt} is null desc`, desc(eventContacts.updatedAt))
          .all()

        if (previous.some((row) => row.removedAt === null)) {
          throw new ContactsError("DuplicateAssignment", `${contact.displayName} is already on this event in that role`)
        }

        const now = new Date().toISOString()
        const removed = previous[0]
        const fields = {
          roleLabel: opts.roleLabel !== undefined ? cleanText(opts.roleLabel) : (removed?.roleLabel ?? null),
          notes: opts.notes !== undefined ? cleanText(opts.notes) : (removed?.notes ?? null),
          isPrimary: false,
          sortOrder: nextSortOrder(tx, eventId, role),
          removedAt: null,
          updatedAt: now,
        }

        let row = removed
          ? tx.update(eventContacts).set(fields).where(eq(eventContacts.id, removed.id)).returning().get()!
          : tx
              .insert(eventContacts)
              .values({ id: uuidv4(), eventId, contactId: contact.id, role, vendorCategoryId, createdAt: now, ...fields })
              .returning()
              .get()

        if (opts.isPrimary) {
          markPrimary(tx, row)
          row = { ...row, isPrimary: true }
        }
        return row
      })
    },

    /** Edits category, label, primary flag, or notes. A category change also ensures the standing role. */
    update: (eventContactId: string, patch: UpdateEventContact): EventContact => {
      return database.transaction((tx) => {
        const row = requireActiveEventContact(tx, eventContactId)
        const updates: Partial<EventContact> = {}

        const nextCategoryId = patch.vendorCategoryId === undefined ? row.vendorCategoryId : patch.vendorCategoryId
        if (nextCategoryId !== row.vendorCategoryId) {
          assertRoleCategory(row.role, nextCategoryId)
          if (nextCategoryId) createVendorCategoriesRepository(tx).requireSelectable(nextCategoryId)

          const clash = tx
            .select({ id: eventContacts.id })
            .from(eventContacts)
            .where(
              and(
                eq(eventContacts.eventId, row.eventId),
                eq(eventContacts.contactId, row.contactId),
                eq(eventContacts.role, row.role),
                matchesCategory(nextCategoryId),
                isNull(eventContacts.removedAt),
                ne(eventContacts.id, row.id),
              ),
            )
            .get()
          if (clash) throw new ContactsError("DuplicateAssignment", "This contact is already on the event in that category")

          createContactRolesRepository(tx).ensure(row.contactId, row.role, nextCategoryId)
          updates.vendorCategoryId = nextCategoryId
        }

        if (patch.roleLabel !== undefined) updates.roleLabel = cleanText(patch.roleLabel)
        if (patch.notes !== undefined) updates.notes = cleanText(patch.notes)
        if (patch.isPrimary === false) updates.isPrimary = false

        tx.update(eventContacts)
          .set({ ...updates, updatedAt: new Date().toISOString() })
          .where(eq(eventContacts.id, row.id))
          .run()
        if (patch.isPrimary === true) markPrimary(tx, row)

        return tx.select().from(eventContacts).where(eq(eventContacts.id, row.id)).get()!
      })
    },

    /** At most one primary per event and role. */
    setPrimary: (eventContactId: string): void => {
      database.transaction((tx) => {
        markPrimary(tx, requireActiveEventContact(tx, eventContactId))
      })
    },

    /** Rewrites sort_order for a role group. orderedIds must be exactly the group's active assignments. */
    reorder: (eventId: string, role: ContactRoleType, orderedIds: string[]): void => {
      if (!isContactRoleType(role)) throw new ContactsError("InvalidInput", `Unknown contact role: ${String(role)}`)
      const ids = requireStringArray(orderedIds, "orderedIds")

      database.transaction((tx) => {
        requireEvent(tx, eventId)
        const groupIds = tx
          .select({ id: eventContacts.id })
          .from(eventContacts)
          .where(and(eq(eventContacts.eventId, eventId), eq(eventContacts.role, role), isNull(eventContacts.removedAt)))
          .all()
          .map((row) => row.id)

        const matchesGroup =
          ids.length === groupIds.length && new Set(ids).size === ids.length && ids.every((id) => groupIds.includes(id))
        if (!matchesGroup) {
          throw new ContactsError("InvalidInput", "orderedIds must list every contact in the group exactly once")
        }

        const now = new Date().toISOString()
        ids.forEach((id, index) => {
          tx.update(eventContacts).set({ sortOrder: index, updatedAt: now }).where(eq(eventContacts.id, id)).run()
        })
      })
    },

    /** Soft remove. The contact's standing role is kept so they stay findable in the directory. */
    remove: (eventContactId: string): void => {
      const row = database.select().from(eventContacts).where(eq(eventContacts.id, eventContactId)).get()
      if (!row) throw new ContactsError("NotFound", `Event contact not found for id ${eventContactId}`)
      if (row.removedAt) return

      const now = new Date().toISOString()
      database
        .update(eventContacts)
        .set({ removedAt: now, isPrimary: false, updatedAt: now })
        .where(eq(eventContacts.id, eventContactId))
        .run()
    },

    /** Every event and role this contact has been on (including removed ones), newest first. */
    listEventsForContact: (contactId: string): ContactEventHistory[] => {
      createContactsRepository(database).requireById(contactId)

      return database
        .select({
          eventContactId: eventContacts.id,
          eventId: events.id,
          eventTitle: events.title,
          eventStatus: events.status,
          eventStartDateTime: events.startDateTime,
          role: eventContacts.role,
          categoryId: vendorCategories.id,
          categoryLabel: vendorCategories.label,
          categoryColor: vendorCategories.colorToken,
          roleLabel: eventContacts.roleLabel,
          isPrimary: eventContacts.isPrimary,
          removedAt: eventContacts.removedAt,
        })
        .from(eventContacts)
        .innerJoin(events, eq(eventContacts.eventId, events.id))
        .leftJoin(vendorCategories, eq(eventContacts.vendorCategoryId, vendorCategories.id))
        .where(eq(eventContacts.contactId, contactId))
        .orderBy(desc(sql`coalesce(${events.startDateTime}, ${events.createdAt})`), desc(eventContacts.createdAt))
        .all()
        .map(({ categoryId, categoryLabel, categoryColor, ...row }) => ({
          ...row,
          vendorCategory: toCategorySummary(categoryId, categoryLabel, categoryColor),
        }))
    },

    /**
     * Turns a selection into a de-duplicated recipient list (by normalized email), in panel order.
     * Contacts with no email are returned separately in `skipped`.
     */
    resolveRecipients: (eventId: string, selection: RecipientSelection): RecipientResolution => {
      requireEvent(database, eventId)

      const isObject = typeof selection === "object" && selection !== null
      let filter: SQL | undefined
      if (isObject && "eventContactIds" in selection) {
        const ids = requireStringArray(selection.eventContactIds, "eventContactIds")
        if (ids.length === 0) return { recipients: [], skipped: [] }
        filter = inArray(eventContacts.id, ids)
      } else if (isObject && "roles" in selection) {
        const roles = requireStringArray(selection.roles, "roles")
        if (!roles.every(isContactRoleType)) throw new ContactsError("InvalidInput", "Unknown contact role in selection")
        if (roles.length === 0) return { recipients: [], skipped: [] }

        const categoryIds =
          selection.vendorCategoryIds === undefined
            ? []
            : requireStringArray(selection.vendorCategoryIds, "vendorCategoryIds")
        filter = inArray(eventContacts.role, roles)
        if (categoryIds.length > 0) {
          // The category filter narrows the vendor group only
          filter = and(
            filter,
            or(ne(eventContacts.role, "vendor"), inArray(eventContacts.vendorCategoryId, categoryIds)),
          )
        }
      } else {
        throw new ContactsError("InvalidInput", "Selection must include eventContactIds or roles")
      }

      return buildRecipientResolution(selectPanelRows(database, eventId, filter))
    },
  }

  return repo
}

const eventContactQueries = createEventContactsRepository(db)

export default eventContactQueries
