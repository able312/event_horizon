import { v } from "convex/values"
import { companyMutation, companyQuery } from "./lib/auth"
import type { MutationCtx } from "./_generated/server"
import { contactFields } from "./lib/contactValidators"
import { assignContact, contactOperation } from "./lib/contactOperations"
import { assertUpdates, requireDocument, toRecord } from "./lib/records"
import { eventStatus, eventType, nullable } from "./lib/validators"
import { normalizeEmail } from "../src/lib/contacts/contactRules"
import { assertValidEventDateRange } from "../src/lib/events/eventDateRange"

const fields = {
  title: v.optional(v.string()), type: v.optional(eventType), status: v.optional(eventStatus),
  startDateTime: v.optional(nullable(v.string())), endDateTime: v.optional(nullable(v.string())),
  minGuests: v.optional(nullable(v.number())), maxGuests: v.optional(nullable(v.number())), guestCountFinal: v.optional(nullable(v.number())),
  driveFolderId: v.optional(nullable(v.string())), calendarId: v.optional(nullable(v.string())),
  clientNotes: v.optional(nullable(v.string())), internalNotes: v.optional(nullable(v.string())), isInternal: v.optional(nullable(v.number())),
}
type EventInput = Partial<Omit<import("./_generated/dataModel").Doc<"events">, "_id" | "_creationTime" | "createdAt" | "updatedAt">>
async function insertEvent(ctx: MutationCtx, data: EventInput, createdAt = Date.now().toString()) {
  const startDateTime = data.startDateTime ?? null, endDateTime = data.endDateTime ?? null
  assertValidEventDateRange(startDateTime, endDateTime)
  const id = await ctx.db.insert("events", {
    title: data.title ?? "", type: data.type ?? "function", status: data.status ?? "new_lead", startDateTime, endDateTime,
    minGuests: data.minGuests ?? null, maxGuests: data.maxGuests ?? null, guestCountFinal: data.guestCountFinal ?? null,
    driveFolderId: data.driveFolderId ?? null, calendarId: data.calendarId ?? null, clientNotes: data.clientNotes ?? null,
    internalNotes: data.internalNotes ?? null, isInternal: data.isInternal ?? 0, createdAt, updatedAt: null,
  })
  return toRecord(await requireDocument(ctx, "events", id))
}
function range(startFrom: string, startTo: string) {
  if (!startFrom || !startTo || Number.isNaN(Date.parse(startFrom)) || Number.isNaN(Date.parse(startTo)) || startFrom >= startTo) throw new Error("Invalid event start range")
}
export const getById = companyQuery({ args: { id: v.id("events") }, handler: async (ctx, { id }) => toRecord(await requireDocument(ctx, "events", id)) })
// The renderer computes local month boundaries, preserving desktop timezone behavior.
export const getStartingBetween = companyQuery({ args: { startFrom: v.string(), startTo: v.string() }, handler: async (ctx, { startFrom, startTo }) => {
  range(startFrom, startTo)
  return (await ctx.db.query("events").withIndex("by_start", q => q.gte("startDateTime", startFrom).lt("startDateTime", startTo)).collect()).map(toRecord)
} })
export const getUnscheduled = companyQuery({ args: {}, handler: async ctx => (await ctx.db.query("events").withIndex("by_start", q => q.eq("startDateTime", null)).collect()).map(toRecord) })
export const getByCalendarIds = companyQuery({ args: { calendarIds: v.array(v.string()) }, handler: async (ctx, { calendarIds }) => {
  const result = []
  for (const id of new Set(calendarIds.map(id => id.trim()).filter(Boolean))) result.push(...(await ctx.db.query("events").withIndex("by_calendarId", q => q.eq("calendarId", id)).collect()).map(toRecord))
  return result
} })
export const create = companyMutation({ args: { input: v.object(fields), client: v.optional(nullable(v.object(contactFields))) }, handler: (ctx, { input, client }) => contactOperation(async () => {
  const event = await insertEvent(ctx, input)
  if (client) {
    const email = normalizeEmail(client.email)
    const existing = email ? (await ctx.db.query("contacts").withIndex("by_emailNormalized", q => q.eq("emailNormalized", email)).collect()).find(c => !c.archivedAt) : null
    await assignContact(ctx, event.id, existing ? { contactId: existing._id } : { newContact: client }, "client", { isPrimary: true })
  }
  return event
}) })
export const update = companyMutation({ args: { id: v.id("events"), updates: v.object(fields) }, handler: async (ctx, { id, updates }) => {
  assertUpdates(updates)
  const current = await requireDocument(ctx, "events", id)
  assertValidEventDateRange(updates.startDateTime === undefined ? current.startDateTime : updates.startDateTime, updates.endDateTime === undefined ? current.endDateTime : updates.endDateTime)
  await ctx.db.patch("events", id, { ...updates, updatedAt: Date.now().toString() })
  return toRecord(await requireDocument(ctx, "events", id))
} })
export const importFromCalendar = companyMutation({ args: { rows: v.array(v.object({ calendarId: v.string(), title: v.string(), startDateTime: v.string(), endDateTime: v.string(), internalNotes: nullable(v.string()) })) }, handler: async (ctx, { rows }) => {
  const inserted = [], duplicateCalendarIds: string[] = [], createdAt = Date.now().toString()
  for (const row of rows) {
    const calendarId = row.calendarId.trim()
    if (!calendarId || !row.title.trim() || Number.isNaN(Date.parse(row.startDateTime)) || Number.isNaN(Date.parse(row.endDateTime))) throw new Error("Invalid calendar event")
    if (await ctx.db.query("events").withIndex("by_calendarId", q => q.eq("calendarId", calendarId)).first()) { duplicateCalendarIds.push(calendarId); continue }
    inserted.push(await insertEvent(ctx, { ...row, calendarId }, createdAt))
  }
  return { inserted, duplicateCalendarIds }
} })
export const remove = companyMutation({ args: { id: v.id("events") }, handler: async (ctx, { id }) => {
  await requireDocument(ctx, "events", id)
  const blocks = await ctx.db.query("timeblocks").withIndex("by_event_section", q => q.eq("eventId", id)).collect()
  for (const block of blocks) {
    for (const item of await ctx.db.query("foodItems").withIndex("by_timeblock", q => q.eq("timeblockId", block._id)).collect()) await ctx.db.delete("foodItems", item._id)
    for (const link of await ctx.db.query("beverageItemTimeblocks").withIndex("by_timeblock", q => q.eq("timeblockId", block._id)).collect()) await ctx.db.delete("beverageItemTimeblocks", link._id)
    await ctx.db.delete("timeblocks", block._id)
  }
  for (const item of await ctx.db.query("beverageItems").withIndex("by_event", q => q.eq("eventId", id)).collect()) {
    for (const link of await ctx.db.query("beverageItemTimeblocks").withIndex("by_item", q => q.eq("beverageItemId", item._id)).collect()) await ctx.db.delete("beverageItemTimeblocks", link._id)
    await ctx.db.delete("beverageItems", item._id)
  }
  for (const table of ["payments", "touchpoints", "menuOfChargeItems", "cartDetails", "tournamentDetails", "eventContacts"] as const) {
    for (const row of await ctx.db.query(table).withIndex("by_event", q => q.eq("eventId", id)).collect()) await ctx.db.delete(table, row._id)
  }
  await ctx.db.delete("events", id)
  return true
} })

// Preserve literal substring matching, client joins, exact totals and relevance.
// This scans the small venue dataset; revisit with denormalized search documents
// before the dataset approaches Convex's transaction read limits.
export const search = companyQuery({ args: { query: v.string(), page: v.number(), pageSize: v.number(), type: v.optional(nullable(eventType)), status: v.optional(nullable(eventStatus)), startFrom: v.optional(nullable(v.string())), startTo: v.optional(nullable(v.string())) }, handler: async (ctx, params) => {
  const query = params.query.trim().toLowerCase()
  if (query.length < 2) throw new Error("searchEvents: query must be at least 2 characters")
  if (!Number.isFinite(params.page) || !Number.isFinite(params.pageSize)) throw new Error("Invalid search pagination")
  const page = Math.max(0, Math.floor(params.page)), pageSize = Math.min(50, Math.max(1, Math.floor(params.pageSize)))
  const startFrom = params.startFrom?.trim(), startTo = params.startTo?.trim()
  if (startFrom && Number.isNaN(Date.parse(startFrom)) || startTo && Number.isNaN(Date.parse(startTo))) throw new Error("Invalid search date")
  if (startFrom && startTo) range(startFrom, startTo)
  const events = startFrom || startTo ? await ctx.db.query("events").withIndex("by_start", q => {
    const lower = q.gte("startDateTime", startFrom || "")
    return startTo ? lower.lt("startDateTime", startTo) : lower
  }).collect() : await ctx.db.query("events").collect()
  const matches = []
  for (const event of events) {
    if (params.type && event.type !== params.type || params.status && event.status !== params.status) continue
    const title = event.title.toLowerCase()
    let rank = title.startsWith(query) ? 1 : title.includes(query) ? 2 : 5
    if (rank > 2) {
      for (const assignment of await ctx.db.query("eventContacts").withIndex("by_event", q => q.eq("eventId", event._id)).collect()) {
        if (assignment.removedAt || assignment.role !== "client") continue
        const client = await ctx.db.get("contacts", assignment.contactId)
        if (!client) continue
        if (client.displayName.toLowerCase().startsWith(query)) rank = Math.min(rank, 3)
        else if ([client.displayName, client.email, client.phone].some(value => value?.toLowerCase().includes(query))) rank = Math.min(rank, 4)
      }
    }
    if (rank < 5) matches.push({ event, rank })
  }
  matches.sort((a,b) => a.rank - b.rank || Number(a.event.startDateTime === null) - Number(b.event.startDateTime === null) || (a.event.startDateTime ?? "").localeCompare(b.event.startDateTime ?? "") || a.event.createdAt.localeCompare(b.event.createdAt) || a.event._id.localeCompare(b.event._id))
  return { items: matches.slice(page * pageSize, (page + 1) * pageSize).map(({ event }) => toRecord(event)), total: matches.length, page, pageSize, hasMore: (page + 1) * pageSize < matches.length }
} })
