import { v } from "convex/values"
import { internalMutation, internalQuery } from "./_generated/server"
import { contactRoleType, nullable } from "./lib/validators"
import { contactOperation, ensureRole } from "./lib/contactOperations"
import { toRecord } from "./lib/records"
import { assertRoleCategory } from "../src/lib/contacts/contactRules"
const roleArgs = { contactId: v.id("contacts"), role: contactRoleType, vendorCategoryId: v.optional(nullable(v.id("vendorCategories"))) }
export const listForContact = internalQuery({ args: { contactId: v.id("contacts") }, handler: async (ctx, { contactId }) => {
  const rows = await ctx.db.query("contactRoles").withIndex("by_contact", q => q.eq("contactId", contactId)).collect()
  return rows.sort((a,b) => a.createdAt.localeCompare(b.createdAt)).map(toRecord)
} })
export const ensure = internalMutation({ args: roleArgs, handler: (ctx, { contactId, role, vendorCategoryId }) => contactOperation(async () => toRecord(await ensureRole(ctx, contactId, role, vendorCategoryId ?? null))) })
export const remove = internalMutation({ args: roleArgs, handler: (ctx, { contactId, role, vendorCategoryId }) => contactOperation(async () => {
  const categoryId = vendorCategoryId ?? null
  assertRoleCategory(role, categoryId)
  for (const row of await ctx.db.query("contactRoles").withIndex("by_contact", q => q.eq("contactId", contactId)).collect()) {
    if (row.role === role && row.vendorCategoryId === categoryId) await ctx.db.delete("contactRoles", row._id)
  }
}) })
