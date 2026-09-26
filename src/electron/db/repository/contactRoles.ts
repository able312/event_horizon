import { and, asc, eq, isNull, type SQL } from "drizzle-orm"
import { v4 as uuidv4 } from "uuid"

import type { ContactRole, ContactRoleType } from "../../../definitions/contacts.js"
import { assertRoleCategory } from "../../../lib/contacts/contactRules.js"
import { ContactsError } from "../../../lib/contacts/contactsError.js"
import type { DbExecutor } from "../factory.js"
import { db } from "../index.js"
import { contactRoles, contacts } from "../schema.js"
import { createVendorCategoriesRepository } from "./vendorCategories.js"

function matchRole(contactId: string, role: ContactRoleType, vendorCategoryId: string | null): SQL | undefined {
  return and(
    eq(contactRoles.contactId, contactId),
    eq(contactRoles.role, role),
    vendorCategoryId ? eq(contactRoles.vendorCategoryId, vendorCategoryId) : isNull(contactRoles.vendorCategoryId),
  )
}

/**
 * Standing roles: what a contact generally does for us. They power the directory
 * and never put a contact on an event by themselves.
 */
export function createContactRolesRepository(database: DbExecutor) {
  const vendorCategoriesRepo = createVendorCategoriesRepository(database)

  return {
    listForContact: (contactId: string): ContactRole[] => {
      return database
        .select()
        .from(contactRoles)
        .where(eq(contactRoles.contactId, contactId))
        .orderBy(asc(contactRoles.createdAt))
        .all()
    },

    /** Idempotent upsert of a standing role. */
    ensure: (contactId: string, role: ContactRoleType, vendorCategoryId?: string | null): ContactRole => {
      const categoryId = vendorCategoryId ?? null
      assertRoleCategory(role, categoryId)

      const existing = database.select().from(contactRoles).where(matchRole(contactId, role, categoryId)).get()
      if (existing) return existing

      const contact = database.select({ id: contacts.id }).from(contacts).where(eq(contacts.id, contactId)).get()
      if (!contact) throw new ContactsError("NotFound", `Contact not found for id ${contactId}`)
      if (categoryId) vendorCategoriesRepo.requireSelectable(categoryId)

      return database
        .insert(contactRoles)
        .values({
          id: uuidv4(),
          contactId,
          role,
          vendorCategoryId: categoryId,
          createdAt: new Date().toISOString(),
        })
        .returning()
        .get()
    },

    /** Removes a standing role. Event assignments are left untouched. */
    remove: (contactId: string, role: ContactRoleType, vendorCategoryId?: string | null): void => {
      const categoryId = vendorCategoryId ?? null
      assertRoleCategory(role, categoryId)
      database.delete(contactRoles).where(matchRole(contactId, role, categoryId)).run()
    },
  }
}

const contactRoleQueries = createContactRolesRepository(db)

export default contactRoleQueries
