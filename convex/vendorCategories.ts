import { v } from "convex/values"
import { internalMutation, internalQuery } from "./_generated/server"
import { contactOperation, requireCategory } from "./lib/contactOperations"
import { toRecord } from "./lib/records"
import { cleanText } from "../src/lib/contacts/contactRules"
import { ContactsError } from "../src/lib/contacts/contactsError"
import { DEFAULT_VENDOR_CATEGORIES } from "../src/lib/contacts/vendorCategoryDefaults"

const fields = { key: v.string(), label: v.string(), colorToken: v.string(), sortOrder: v.optional(v.number()) }
function text(value: string, field: string) {
  const result = cleanText(value)
  if (!result) throw new ContactsError("InvalidInput", `Vendor category ${field} is required`)
  return result
}
function key(value: string) {
  const result = text(value, "key").toLowerCase()
  if (!/^[a-z0-9_]+$/.test(result)) throw new ContactsError("InvalidInput", "Vendor category key may only contain a-z, 0-9 and _")
  return result
}
function sortOrder(value: number) {
  if (!Number.isInteger(value)) throw new ContactsError("InvalidInput", "Vendor category sortOrder must be an integer")
  return value
}
export const getAll = internalQuery({ args: { includeArchived: v.optional(v.boolean()) }, handler: async (ctx, { includeArchived }) => {
  const rows = await ctx.db.query("vendorCategories").collect()
  return rows.filter(r => includeArchived || !r.archivedAt).sort((a,b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label)).map(toRecord)
} })
export const create = internalMutation({ args: { input: v.object(fields) }, handler: (ctx, { input }) => contactOperation(async () => {
  const categoryKey = key(input.key)
  if (await ctx.db.query("vendorCategories").withIndex("by_key", q => q.eq("key", categoryKey)).first()) throw new ContactsError("InvalidInput", "Vendor category key already exists")
  const id = await ctx.db.insert("vendorCategories", { key: categoryKey, label: text(input.label, "label"), colorToken: text(input.colorToken, "colorToken"), sortOrder: sortOrder(input.sortOrder ?? 0), archivedAt: null })
  return toRecord(await requireCategory(ctx, id))
}) })
export const update = internalMutation({ args: { id: v.id("vendorCategories"), patch: v.object({ key: v.optional(v.string()), label: v.optional(v.string()), colorToken: v.optional(v.string()), sortOrder: v.optional(v.number()) }) }, handler: (ctx, { id, patch }) => contactOperation(async () => {
  const existing = await requireCategory(ctx, id)
  const nextKey = patch.key === undefined ? existing.key : key(patch.key)
  if (nextKey !== existing.key) {
    if (await ctx.db.query("contactRoles").withIndex("by_vendorCategory", q => q.eq("vendorCategoryId", id)).first() || await ctx.db.query("eventContacts").withIndex("by_vendorCategory", q => q.eq("vendorCategoryId", id)).first()) throw new ContactsError("InvalidInput", "Vendor category key can't change once the category is in use")
    if (await ctx.db.query("vendorCategories").withIndex("by_key", q => q.eq("key", nextKey)).first()) throw new ContactsError("InvalidInput", "Vendor category key already exists")
  }
  await ctx.db.patch("vendorCategories", id, { key: nextKey, label: patch.label === undefined ? existing.label : text(patch.label, "label"), colorToken: patch.colorToken === undefined ? existing.colorToken : text(patch.colorToken, "colorToken"), sortOrder: patch.sortOrder === undefined ? existing.sortOrder : sortOrder(patch.sortOrder) })
  return toRecord(await requireCategory(ctx, id))
}) })
export const archive = internalMutation({ args: { id: v.id("vendorCategories") }, handler: (ctx, { id }) => contactOperation(async () => {
  const category = await requireCategory(ctx, id)
  if (!category.archivedAt) await ctx.db.patch("vendorCategories", id, { archivedAt: new Date().toISOString() })
}) })
export const restore = internalMutation({ args: { id: v.id("vendorCategories") }, handler: (ctx, { id }) => contactOperation(async () => {
  await requireCategory(ctx, id); await ctx.db.patch("vendorCategories", id, { archivedAt: null })
}) })
export const seedDefaults = internalMutation({ args: {}, handler: async ctx => {
  for (const category of DEFAULT_VENDOR_CATEGORIES) {
    if (!await ctx.db.query("vendorCategories").withIndex("by_key", q => q.eq("key", category.key)).first()) await ctx.db.insert("vendorCategories", { ...category, archivedAt: null })
  }
} })
