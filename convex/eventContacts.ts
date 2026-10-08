import { v } from "convex/values"
import { internalMutation, internalQuery } from "./_generated/server"
import type { Id } from "./_generated/dataModel"
import type { QueryCtx } from "./_generated/server"
import type { PrimaryClient } from "../src/definitions/contacts"
import { contactFields, assignmentFields } from "./lib/contactValidators"
import { activeAssignment, assignContact, categorySummary, contactOperation, eventAssignments, markPrimary, requireContact, updateAssignment, updateContact } from "./lib/contactOperations"
import { contactRoleType } from "./lib/validators"
import { buildRecipientResolution, deriveInitials, groupPanelItems, PANEL_ROLE_ORDER } from "../src/lib/contacts/contactRules"
import { ContactsError } from "../src/lib/contacts/contactsError"

async function panelRows(ctx: QueryCtx, eventId: Id<"events">) {
  const rows = []
  for (const row of await eventAssignments(ctx, eventId)) {
    if (row.removedAt) continue
    const contact = await requireContact(ctx, row.contactId)
    const category = row.vendorCategoryId ? await ctx.db.get("vendorCategories", row.vendorCategoryId) : null
    rows.push({ role: row.role, sortOrder: row.sortOrder, categoryOrder: category?.sortOrder ?? 0, item: {
      eventContactId: row._id, contactId: contact._id, displayName: contact.displayName, initials: deriveInitials(contact.displayName),
      email: contact.email, phone: contact.phone, roleLabel: row.roleLabel, notes: row.notes,
      vendorCategory: await categorySummary(ctx, row.vendorCategoryId), isPrimary: row.isPrimary, contactArchived: contact.archivedAt !== null,
    } })
  }
  return rows.sort((a,b) => PANEL_ROLE_ORDER.indexOf(a.role) - PANEL_ROLE_ORDER.indexOf(b.role) || Number(b.item.isPrimary) - Number(a.item.isPrimary) || a.sortOrder - b.sortOrder || a.categoryOrder - b.categoryOrder || a.item.displayName.toLowerCase().localeCompare(b.item.displayName.toLowerCase()))
}
export const getPanel = internalQuery({ args: { eventId: v.id("events") }, handler: (ctx, { eventId }) => contactOperation(async () => ({ eventId, groups: groupPanelItems(await panelRows(ctx, eventId)) })) })
export const getPrimaryClients = internalQuery({ args: { eventIds: v.array(v.id("events")) }, handler: (ctx, { eventIds }) => contactOperation(async () => {
  const result: Record<string, PrimaryClient> = {}
  for (const eventId of new Set(eventIds)) {
    const client = (await panelRows(ctx, eventId)).find(r => r.role === "client")?.item
    if (client) result[eventId] = { contactId: client.contactId, displayName: client.displayName, email: client.email, phone: client.phone }
  }
  return result
}) })
export const assign = internalMutation({ args: { eventId: v.id("events"), target: v.union(v.object({ contactId: v.id("contacts") }), v.object({ newContact: v.object(contactFields) })), role: contactRoleType, opts: v.optional(v.object(assignmentFields)) }, handler: (ctx, args) => contactOperation(() => assignContact(ctx, args.eventId, args.target, args.role, args.opts)) })
export const update = internalMutation({ args: { id: v.id("eventContacts"), patch: v.object(assignmentFields) }, handler: (ctx, { id, patch }) => contactOperation(() => updateAssignment(ctx, id, patch)) })
export const updateWithContact = internalMutation({ args: { id: v.id("eventContacts"), contactPatch: v.object(contactFields), assignmentPatch: v.object(assignmentFields) }, handler: (ctx, { id, contactPatch, assignmentPatch }) => contactOperation(async () => {
  const row = await activeAssignment(ctx, id)
  await updateContact(ctx, row.contactId, contactPatch)
  return updateAssignment(ctx, id, assignmentPatch)
}) })
export const setPrimary = internalMutation({ args: { id: v.id("eventContacts") }, handler: (ctx, { id }) => contactOperation(async () => { await markPrimary(ctx, await activeAssignment(ctx, id)) }) })
export const reorder = internalMutation({ args: { eventId: v.id("events"), role: contactRoleType, orderedIds: v.array(v.id("eventContacts")) }, handler: (ctx, { eventId, role, orderedIds }) => contactOperation(async () => {
  const rows = (await eventAssignments(ctx, eventId)).filter(r => r.role === role && !r.removedAt)
  if (orderedIds.length !== rows.length || new Set(orderedIds).size !== orderedIds.length || !orderedIds.every(id => rows.some(r => r._id === id))) throw new ContactsError("InvalidInput", "orderedIds must list every contact in the group exactly once")
  const now = new Date().toISOString()
  for (const [sortOrder, id] of orderedIds.entries()) await ctx.db.patch("eventContacts", id, { sortOrder, updatedAt: now })
}) })
export const remove = internalMutation({ args: { id: v.id("eventContacts") }, handler: (ctx, { id }) => contactOperation(async () => {
  const row = await ctx.db.get("eventContacts", id)
  if (!row) throw new ContactsError("NotFound", "Event contact not found")
  if (!row.removedAt) { const now = new Date().toISOString(); await ctx.db.patch("eventContacts", id, { removedAt: now, isPrimary: false, updatedAt: now }) }
}) })
export const listEventsForContact = internalQuery({ args: { contactId: v.id("contacts") }, handler: (ctx, { contactId }) => contactOperation(async () => {
  await requireContact(ctx, contactId)
  const rows = []
  for (const row of await ctx.db.query("eventContacts").withIndex("by_contact", q => q.eq("contactId", contactId)).collect()) {
    const event = await ctx.db.get("events", row.eventId)
    if (!event) continue
    rows.push({ order: event.startDateTime ?? event.createdAt, createdAt: row.createdAt, eventContactId: row._id, eventId: event._id, eventTitle: event.title, eventStatus: event.status, eventStartDateTime: event.startDateTime, role: row.role, vendorCategory: await categorySummary(ctx, row.vendorCategoryId), roleLabel: row.roleLabel, isPrimary: row.isPrimary, removedAt: row.removedAt })
  }
  return rows.sort((a,b) => b.order.localeCompare(a.order) || b.createdAt.localeCompare(a.createdAt)).map(({ order, createdAt, ...row }) => { void order; void createdAt; return row })
}) })
export const resolveRecipients = internalQuery({ args: { eventId: v.id("events"), selection: v.union(v.object({ eventContactIds: v.array(v.id("eventContacts")) }), v.object({ roles: v.array(contactRoleType), vendorCategoryIds: v.optional(v.array(v.id("vendorCategories"))) })) }, handler: (ctx, { eventId, selection }) => contactOperation(async () => {
  const rows = await panelRows(ctx, eventId)
  return buildRecipientResolution(rows.filter(r => "eventContactIds" in selection ? selection.eventContactIds.includes(r.item.eventContactId) : selection.roles.includes(r.role) && (r.role !== "vendor" || !selection.vendorCategoryIds?.length || !!r.item.vendorCategory && selection.vendorCategoryIds.includes(r.item.vendorCategory.id))).map(r => r.item))
}) })
