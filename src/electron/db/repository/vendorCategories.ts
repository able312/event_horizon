import { and, asc, eq, isNull } from "drizzle-orm"
import { v4 as uuidv4 } from "uuid"

import type {
  NewVendorCategory,
  UpdateVendorCategory,
  VendorCategory,
} from "../../../definitions/contacts.js"
import { cleanText } from "../../../lib/contacts/contactRules.js"
import { ContactsError } from "../../../lib/contacts/contactsError.js"
import type { DbExecutor } from "../factory.js"
import { db } from "../index.js"
import { contactRoles, eventContacts, vendorCategories } from "../schema.js"

/** Keep in sync with the seed rows in migrations/drizzle/0018_contacts.sql. */
export const DEFAULT_VENDOR_CATEGORIES: ReadonlyArray<Required<NewVendorCategory>> = [
  { key: "catering", label: "Catering", colorToken: "teal", sortOrder: 10 },
  { key: "rentals", label: "Rentals", colorToken: "amber", sortOrder: 20 },
  { key: "music", label: "Music", colorToken: "violet", sortOrder: 30 },
  { key: "photography", label: "Photography", colorToken: "sky", sortOrder: 40 },
  { key: "venue", label: "Venue", colorToken: "stone", sortOrder: 50 },
  { key: "av_staging", label: "AV and staging", colorToken: "indigo", sortOrder: 60 },
  { key: "florals", label: "Florals", colorToken: "rose", sortOrder: 70 },
  { key: "other", label: "Other", colorToken: "slate", sortOrder: 80 },
]

const KEY_PATTERN = /^[a-z0-9_]+$/

function requireText(value: string | null | undefined, field: string): string {
  const cleaned = cleanText(value)
  if (!cleaned) throw new ContactsError("InvalidInput", `Vendor category ${field} is required`)
  return cleaned
}

function requireKey(value: string | null | undefined): string {
  const key = requireText(value, "key").toLowerCase()
  if (!KEY_PATTERN.test(key)) {
    throw new ContactsError("InvalidInput", "Vendor category key may only contain a-z, 0-9 and _")
  }
  return key
}

function requireSortOrder(value: number): number {
  if (!Number.isInteger(value)) throw new ContactsError("InvalidInput", "Vendor category sortOrder must be an integer")
  return value
}

export function createVendorCategoriesRepository(database: DbExecutor) {
  const repo = {
    list: (options: { includeArchived?: boolean } = {}): VendorCategory[] => {
      return database
        .select()
        .from(vendorCategories)
        .where(options.includeArchived ? undefined : isNull(vendorCategories.archivedAt))
        .orderBy(asc(vendorCategories.sortOrder), asc(vendorCategories.label))
        .all()
    },

    getById: (id: string): VendorCategory | null => {
      return database.select().from(vendorCategories).where(eq(vendorCategories.id, id)).get() ?? null
    },

    /** Returns the category if it can be picked for a new role or assignment. */
    requireSelectable: (id: string): VendorCategory => {
      const category = repo.getById(id)
      if (!category) throw new ContactsError("NotFound", `Vendor category not found for id ${id}`)
      if (category.archivedAt) {
        throw new ContactsError("InvalidRoleCategory", `Vendor category "${category.label}" is archived`)
      }
      return category
    },

    create: (input: NewVendorCategory): VendorCategory => {
      const key = requireKey(input.key)
      const existing = database.select().from(vendorCategories).where(eq(vendorCategories.key, key)).get()
      if (existing) throw new ContactsError("InvalidInput", `Vendor category key "${key}" already exists`)

      return database
        .insert(vendorCategories)
        .values({
          id: uuidv4(),
          key,
          label: requireText(input.label, "label"),
          colorToken: requireText(input.colorToken, "colorToken"),
          sortOrder: requireSortOrder(input.sortOrder ?? 0),
        })
        .returning()
        .get()
    },

    update: (id: string, patch: UpdateVendorCategory): VendorCategory => {
      const existing = repo.getById(id)
      if (!existing) throw new ContactsError("NotFound", `Vendor category not found for id ${id}`)

      const updates: Partial<VendorCategory> = {}
      if (patch.label !== undefined) updates.label = requireText(patch.label, "label")
      if (patch.colorToken !== undefined) updates.colorToken = requireText(patch.colorToken, "colorToken")
      if (patch.sortOrder !== undefined) updates.sortOrder = requireSortOrder(patch.sortOrder)

      if (patch.key !== undefined) {
        const key = requireKey(patch.key)
        if (key !== existing.key) {
          if (repo.isInUse(id)) {
            throw new ContactsError("InvalidInput", "Vendor category key can't change once the category is in use")
          }
          const clash = database.select().from(vendorCategories).where(eq(vendorCategories.key, key)).get()
          if (clash) throw new ContactsError("InvalidInput", `Vendor category key "${key}" already exists`)
          updates.key = key
        }
      }

      if (Object.keys(updates).length === 0) return existing

      return database.update(vendorCategories).set(updates).where(eq(vendorCategories.id, id)).returning().get()!
    },

    isInUse: (id: string): boolean => {
      const role = database
        .select({ id: contactRoles.id })
        .from(contactRoles)
        .where(eq(contactRoles.vendorCategoryId, id))
        .limit(1)
        .get()
      if (role) return true

      const assignment = database
        .select({ id: eventContacts.id })
        .from(eventContacts)
        .where(eq(eventContacts.vendorCategoryId, id))
        .limit(1)
        .get()
      return Boolean(assignment)
    },

    archive: (id: string): void => {
      const changed = database
        .update(vendorCategories)
        .set({ archivedAt: new Date().toISOString() })
        .where(and(eq(vendorCategories.id, id), isNull(vendorCategories.archivedAt)))
        .run().changes
      if (changed === 0 && !repo.getById(id)) {
        throw new ContactsError("NotFound", `Vendor category not found for id ${id}`)
      }
    },

    restore: (id: string): void => {
      const changed = database
        .update(vendorCategories)
        .set({ archivedAt: null })
        .where(eq(vendorCategories.id, id))
        .run().changes
      if (changed === 0) throw new ContactsError("NotFound", `Vendor category not found for id ${id}`)
    },

    /** Idempotent: inserts any default category whose key is missing. The migration seeds these too. */
    seedDefaults: (): void => {
      for (const category of DEFAULT_VENDOR_CATEGORIES) {
        database
          .insert(vendorCategories)
          .values({ id: uuidv4(), ...category })
          .onConflictDoNothing({ target: vendorCategories.key })
          .run()
      }
    },
  }

  return repo
}

const vendorCategoryQueries = createVendorCategoriesRepository(db)

export default vendorCategoryQueries
