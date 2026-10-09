import { v } from "convex/values"
import { companyMutation, companyQuery } from "./lib/auth"
import { contactFields } from "./lib/contactValidators"
import { assertEmailAvailable, categorySummary, contactOperation, createContact, requireContact, updateContact } from "./lib/contactOperations"
import { toRecord } from "./lib/records"
import { contactRoleType, nullable } from "./lib/validators"
import { ContactsError } from "../src/lib/contacts/contactsError"
import { normalizeEmail } from "../src/lib/contacts/contactRules"

// Public functions; every handler requires a company identity (lib/auth.ts).
export const getById = companyQuery({ args: { id: v.id("contacts") }, handler: async (ctx, { id }) => {
  const doc = await ctx.db.get("contacts", id)
  return doc ? toRecord(doc) : null
} })
export const create = companyMutation({ args: { input: v.object(contactFields) }, handler: (ctx, { input }) => contactOperation(async () => toRecord(await createContact(ctx, input))) })
export const update = companyMutation({ args: { id: v.id("contacts"), patch: v.object(contactFields) }, handler: (ctx, { id, patch }) => contactOperation(async () => toRecord(await updateContact(ctx, id, patch))) })
export const archive = companyMutation({ args: { id: v.id("contacts") }, handler: (ctx, { id }) => contactOperation(async () => {
  const contact = await requireContact(ctx, id)
  if (!contact.archivedAt) { const now = new Date().toISOString(); await ctx.db.patch("contacts", id, { archivedAt: now, updatedAt: now }) }
}) })
export const restore = companyMutation({ args: { id: v.id("contacts") }, handler: (ctx, { id }) => contactOperation(async () => {
  const contact = await requireContact(ctx, id)
  if (!contact.archivedAt) return
  await assertEmailAvailable(ctx, contact.email, id)
  await ctx.db.patch("contacts", id, { archivedAt: null, updatedAt: new Date().toISOString() })
}) })
export const remove = companyMutation({ args: { id: v.id("contacts") }, handler: (ctx, { id }) => contactOperation(async () => {
  await requireContact(ctx, id)
  if (await ctx.db.query("eventContacts").withIndex("by_contact", q => q.eq("contactId", id)).first()) {
    throw new ContactsError("ContactInUse", "This contact has event history; archive it instead")
  }
  for (const role of await ctx.db.query("contactRoles").withIndex("by_contact", q => q.eq("contactId", id)).collect()) await ctx.db.delete("contactRoles", role._id)
  await ctx.db.delete("contacts", id)
}) })

export const search = companyQuery({ args: {
  query: v.optional(v.string()), role: v.optional(contactRoleType), vendorCategoryId: v.optional(v.id("vendorCategories")),
  includeArchived: v.optional(v.boolean()), limit: v.number(), cursor: v.optional(nullable(v.string())),
}, handler: (ctx, params) => contactOperation(async () => {
  if (!Number.isFinite(params.limit)) throw new ContactsError("InvalidInput", "Invalid search limit")
  const limit = Math.min(100, Math.max(1, Math.floor(params.limit)))
  // A keyset cursor survives insertions/removals before the previous page. It is
  // scoped to the filters; substring search intentionally preserves SQLite semantics.
  const query = params.query?.trim().toLowerCase() ?? ""
  const filterKey = JSON.stringify([query, params.role ?? null, params.vendorCategoryId ?? null, !!params.includeArchived])
  let after: [string, string] | null = null
  if (params.cursor) {
    try {
      const parsed: unknown = JSON.parse(params.cursor)
      if (!Array.isArray(parsed) || parsed.length !== 3 || parsed[0] !== filterKey || typeof parsed[1] !== "string" || typeof parsed[2] !== "string") throw new Error()
      after = [parsed[1], parsed[2]]
    } catch { throw new ContactsError("InvalidInput", "Invalid search cursor") }
  }
  const role = params.role ?? (params.vendorCategoryId ? "vendor" : undefined)
  const candidates = []
  for (const contact of await ctx.db.query("contacts").collect()) {
    if (!params.includeArchived && contact.archivedAt) continue
    if (query && ![contact.displayName, contact.organizationName, contact.emailNormalized, contact.phone].some(value => value?.toLowerCase().includes(query))) continue
    const name = contact.displayName.toLowerCase()
    if (after && (name < after[0] || (name === after[0] && contact._id <= after[1]))) continue
    const roles = await ctx.db.query("contactRoles").withIndex("by_contact", q => q.eq("contactId", contact._id)).collect()
    if (role && !roles.some(r => r.role === role && (!params.vendorCategoryId || r.vendorCategoryId === params.vendorCategoryId))) continue
    const summaries = await Promise.all(roles.map(async r => ({ id: r._id, role: r.role, vendorCategory: await categorySummary(ctx, r.vendorCategoryId), sortOrder: r.vendorCategoryId ? (await ctx.db.get("vendorCategories", r.vendorCategoryId))?.sortOrder ?? 0 : 0 })))
    summaries.sort((a,b) => a.role.localeCompare(b.role) || a.sortOrder - b.sortOrder)
    candidates.push({ ...toRecord(contact), roles: summaries.map(({ sortOrder, ...summary }) => { void sortOrder; return summary }) })
  }
  candidates.sort((a,b) => {
    const left = a.displayName.toLowerCase(), right = b.displayName.toLowerCase()
    return left < right ? -1 : left > right ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })
  const items = candidates.slice(0, limit), last = items[items.length - 1]
  return { items, nextCursor: candidates.length > limit && last ? JSON.stringify([filterKey, last.displayName.toLowerCase(), last.id]) : null }
}) })

export const merge = companyMutation({ args: { sourceId: v.id("contacts"), targetId: v.id("contacts") }, handler: (ctx, { sourceId, targetId }) => contactOperation(async () => {
  if (sourceId === targetId) throw new ContactsError("InvalidInput", "Can't merge a contact into itself")
  const source = await requireContact(ctx, sourceId), target = await requireContact(ctx, targetId)
  if (target.archivedAt) throw new ContactsError("ContactArchived", "Restore the target before merging")
  const targetRoles = await ctx.db.query("contactRoles").withIndex("by_contact", q => q.eq("contactId", targetId)).collect()
  for (const role of await ctx.db.query("contactRoles").withIndex("by_contact", q => q.eq("contactId", sourceId)).collect()) {
    if (!targetRoles.some(r => r.role === role.role && r.vendorCategoryId === role.vendorCategoryId)) {
      // Historical roles remain valid even when their category is archived.
      const { _id, _creationTime, ...fields } = role; void _id; void _creationTime
      await ctx.db.insert("contactRoles", { ...fields, contactId: targetId })
    }
    await ctx.db.delete("contactRoles", role._id)
  }
  const now = new Date().toISOString()
  for (const row of await ctx.db.query("eventContacts").withIndex("by_contact", q => q.eq("contactId", sourceId)).collect()) {
    const duplicate = row.removedAt ? null : (await ctx.db.query("eventContacts").withIndex("by_event", q => q.eq("eventId", row.eventId)).collect())
      .find(r => r.contactId === targetId && r.role === row.role && r.vendorCategoryId === row.vendorCategoryId && !r.removedAt)
    if (duplicate) {
      await ctx.db.patch("eventContacts", duplicate._id, { isPrimary: duplicate.isPrimary || row.isPrimary, roleLabel: duplicate.roleLabel ?? row.roleLabel, notes: duplicate.notes ?? row.notes, updatedAt: now })
      await ctx.db.delete("eventContacts", row._id)
    } else await ctx.db.patch("eventContacts", row._id, { contactId: targetId, updatedAt: now })
  }
  await ctx.db.patch("contacts", sourceId, { archivedAt: source.archivedAt ?? now, updatedAt: now })
  let email = target.email
  if (!email && source.email) {
    const taken = await ctx.db.query("contacts").withIndex("by_emailNormalized", q => q.eq("emailNormalized", normalizeEmail(source.email))).collect()
    if (!taken.some(c => !c.archivedAt)) email = source.email
  }
  await ctx.db.patch("contacts", targetId, { email, emailNormalized: normalizeEmail(email), phone: target.phone ?? source.phone, notes: target.notes ?? source.notes, updatedAt: now })
  return toRecord(await requireContact(ctx, targetId))
}) })
