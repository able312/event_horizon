import { ConvexError } from "convex/values"
import type { Doc, Id } from "../_generated/dataModel"
import type { MutationCtx, QueryCtx } from "../_generated/server"
import type { NewContact, UpdateContact, ContactRoleType, AssignEventContactOptions, UpdateEventContact } from "../../src/definitions/contacts"
import { assertRoleCategory, buildContactFields, cleanText, deriveDisplayName, normalizeEmail } from "../../src/lib/contacts/contactRules"
import { ContactsError } from "../../src/lib/contacts/contactsError"
import { toRecord } from "./records"

type ReadCtx = Pick<QueryCtx, "db">

// Keep the existing structured contact errors intact across the network boundary.
export async function contactOperation<T>(operation: () => Promise<T>): Promise<T> {
  try { return await operation() } catch (error) {
    if (error instanceof ContactsError) throw new ConvexError({ ...error.toPayload() })
    throw error
  }
}

export async function requireContact(ctx: ReadCtx, id: Id<"contacts">) {
  const contact = await ctx.db.get("contacts", id)
  if (!contact) throw new ContactsError("NotFound", "Contact not found")
  return contact
}

export async function requireCategory(ctx: ReadCtx, id: Id<"vendorCategories">, selectable = false) {
  const category = await ctx.db.get("vendorCategories", id)
  if (!category) throw new ContactsError("NotFound", "Vendor category not found")
  if (selectable && category.archivedAt) throw new ContactsError("InvalidInput", "Vendor category is archived")
  return category
}

export async function assertEmailAvailable(ctx: ReadCtx, email: string | null, exclude?: Id<"contacts">) {
  const normalized = normalizeEmail(email)
  if (!normalized) return
  const contacts = await ctx.db.query("contacts").withIndex("by_emailNormalized", q => q.eq("emailNormalized", normalized)).collect()
  const existing = contacts.find(c => !c.archivedAt && c._id !== exclude)
  if (existing) throw new ContactsError("EmailTaken", `${email} already belongs to ${existing.displayName}`, existing._id)
}

export async function createContact(ctx: MutationCtx, input: NewContact) {
  const fields = buildContactFields({ ...input, kind: input.kind ?? "individual" })
  await assertEmailAvailable(ctx, fields.email)
  const now = new Date().toISOString()
  const id = await ctx.db.insert("contacts", { ...fields, emailNormalized: normalizeEmail(fields.email), archivedAt: null, createdAt: now, updatedAt: now })
  return requireContact(ctx, id)
}

export async function updateContact(ctx: MutationCtx, id: Id<"contacts">, patch: UpdateContact) {
  const existing = await requireContact(ctx, id)
  const nameParts = {
    kind: patch.kind ?? existing.kind,
    firstName: patch.firstName === undefined ? existing.firstName : patch.firstName,
    lastName: patch.lastName === undefined ? existing.lastName : patch.lastName,
    organizationName: patch.organizationName === undefined ? existing.organizationName : patch.organizationName,
  }
  const nameChanged = (["kind", "firstName", "lastName", "organizationName"] as const).some(key => patch[key] !== undefined)
  const derived = deriveDisplayName(existing)
  const displayName = patch.displayName !== undefined ? patch.displayName
    : nameChanged && (derived === null || existing.displayName === derived) && deriveDisplayName(nameParts) ? null : existing.displayName
  const fields = buildContactFields({
    ...nameParts, displayName,
    email: patch.email === undefined ? existing.email : patch.email,
    phone: patch.phone === undefined ? existing.phone : patch.phone,
    notes: patch.notes === undefined ? existing.notes : patch.notes,
  })
  if (!existing.archivedAt) await assertEmailAvailable(ctx, fields.email, id)
  await ctx.db.patch("contacts", id, { ...fields, emailNormalized: normalizeEmail(fields.email), updatedAt: new Date().toISOString() })
  return requireContact(ctx, id)
}

export async function ensureRole(ctx: MutationCtx, contactId: Id<"contacts">, role: ContactRoleType, vendorCategoryId: Id<"vendorCategories"> | null) {
  assertRoleCategory(role, vendorCategoryId)
  const rows = await ctx.db.query("contactRoles").withIndex("by_contact", q => q.eq("contactId", contactId)).collect()
  const existing = rows.find(r => r.role === role && r.vendorCategoryId === vendorCategoryId)
  if (existing) return existing
  await requireContact(ctx, contactId)
  if (vendorCategoryId) await requireCategory(ctx, vendorCategoryId, true)
  const id = await ctx.db.insert("contactRoles", { contactId, role, vendorCategoryId, createdAt: new Date().toISOString() })
  return (await ctx.db.get("contactRoles", id))!
}

export async function eventAssignments(ctx: ReadCtx, eventId: Id<"events">) {
  if (!await ctx.db.get("events", eventId)) throw new ContactsError("NotFound", "Event not found")
  return ctx.db.query("eventContacts").withIndex("by_event", q => q.eq("eventId", eventId)).collect()
}

export async function activeAssignment(ctx: ReadCtx, id: Id<"eventContacts">) {
  const row = await ctx.db.get("eventContacts", id)
  if (!row) throw new ContactsError("NotFound", "Event contact not found")
  if (row.removedAt) throw new ContactsError("InvalidInput", "This contact has been removed from the event")
  return row
}

export async function markPrimary(ctx: MutationCtx, row: Doc<"eventContacts">) {
  const now = new Date().toISOString()
  for (const other of await eventAssignments(ctx, row.eventId)) {
    if (other.role === row.role && other.isPrimary && other._id !== row._id) {
      await ctx.db.patch("eventContacts", other._id, { isPrimary: false, updatedAt: now })
    }
  }
  await ctx.db.patch("eventContacts", row._id, { isPrimary: true, updatedAt: now })
}

type AssignmentOptions = Omit<AssignEventContactOptions, "vendorCategoryId"> & { vendorCategoryId?: Id<"vendorCategories"> | null }
export async function assignContact(ctx: MutationCtx, eventId: Id<"events">,
  target: { contactId: Id<"contacts"> } | { newContact: NewContact }, role: ContactRoleType, opts: AssignmentOptions = {}) {
  const vendorCategoryId = opts.vendorCategoryId ?? null
  assertRoleCategory(role, vendorCategoryId)
  const rows = await eventAssignments(ctx, eventId)
  if (vendorCategoryId) await requireCategory(ctx, vendorCategoryId, true)
  const contact = "contactId" in target ? await requireContact(ctx, target.contactId) : await createContact(ctx, target.newContact)
  if (contact.archivedAt) throw new ContactsError("ContactArchived", `${contact.displayName} is archived and can't be assigned`)
  await ensureRole(ctx, contact._id, role, vendorCategoryId)
  const previous = rows.filter(r => r.contactId === contact._id && r.role === role && r.vendorCategoryId === vendorCategoryId)
  if (previous.some(r => !r.removedAt)) throw new ContactsError("DuplicateAssignment", "Contact is already on this event in that role")
  previous.sort((a,b) => b.updatedAt.localeCompare(a.updatedAt))
  const removed = previous[0]
  const active = rows.filter(r => r.role === role && !r.removedAt)
  const now = new Date().toISOString()
  const fields = {
    roleLabel: opts.roleLabel === undefined ? removed?.roleLabel ?? null : cleanText(opts.roleLabel),
    notes: opts.notes === undefined ? removed?.notes ?? null : cleanText(opts.notes),
    isPrimary: false, sortOrder: active.length ? Math.max(...active.map(r => r.sortOrder)) + 1 : 0,
    removedAt: null, updatedAt: now,
  }
  let id: Id<"eventContacts">
  if (removed) { id = removed._id; await ctx.db.patch("eventContacts", id, fields) }
  else id = await ctx.db.insert("eventContacts", { eventId, contactId: contact._id, role, vendorCategoryId, createdAt: now, ...fields })
  if (opts.isPrimary) await markPrimary(ctx, (await ctx.db.get("eventContacts", id))!)
  return toRecord((await ctx.db.get("eventContacts", id))!)
}

type AssignmentPatch = Omit<UpdateEventContact, "vendorCategoryId"> & { vendorCategoryId?: Id<"vendorCategories"> | null }
export async function updateAssignment(ctx: MutationCtx, id: Id<"eventContacts">, patch: AssignmentPatch) {
  const row = await activeAssignment(ctx, id)
  const categoryId = patch.vendorCategoryId === undefined ? row.vendorCategoryId : patch.vendorCategoryId
  if (categoryId !== row.vendorCategoryId) {
    assertRoleCategory(row.role, categoryId)
    if (categoryId) await requireCategory(ctx, categoryId, true)
    const rows = await eventAssignments(ctx, row.eventId)
    if (rows.some(r => r._id !== id && !r.removedAt && r.contactId === row.contactId && r.role === row.role && r.vendorCategoryId === categoryId)) {
      throw new ContactsError("DuplicateAssignment", "This contact is already on the event in that category")
    }
    await ensureRole(ctx, row.contactId, row.role, categoryId)
  }
  await ctx.db.patch("eventContacts", id, {
    vendorCategoryId: categoryId,
    ...(patch.roleLabel !== undefined ? { roleLabel: cleanText(patch.roleLabel) } : {}),
    ...(patch.notes !== undefined ? { notes: cleanText(patch.notes) } : {}),
    ...(patch.isPrimary === false ? { isPrimary: false } : {}), updatedAt: new Date().toISOString(),
  })
  if (patch.isPrimary === true) await markPrimary(ctx, row)
  return toRecord((await ctx.db.get("eventContacts", id))!)
}

export async function categorySummary(ctx: ReadCtx, id: Id<"vendorCategories"> | null) {
  const category = id ? await ctx.db.get("vendorCategories", id) : null
  return category ? { id: category._id, label: category.label, colorToken: category.colorToken } : null
}
