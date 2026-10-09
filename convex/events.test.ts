import { convexTest } from "convex-test"
import { describe, expect, it } from "vitest"
import { api } from "./_generated/api"
import { companyIdentity } from "./lib/testIdentity"
import schema from "./schema"
const modules = import.meta.glob("./**/*.{ts,js}")
const setup = () => convexTest(schema, modules).withIdentity(companyIdentity)

describe("Convex events", () => {
  it("creates defaults and an atomic primary client, reusing active email matches", async () => {
    const t = setup()
    const empty = await t.mutation(api.events.create, { input: {} })
    expect(empty).toMatchObject({ title: "", type: "function", status: "new_lead", startDateTime: null, endDateTime: null, isInternal: 0, updatedAt: null })
    expect(await t.query(api.events.getById, { id: empty.id })).toEqual(empty)
    const event = await t.mutation(api.events.create, { input: { title: "Dinner" }, client: { firstName: "Ada", email: "ada@example.com" } })
    const reused = await t.mutation(api.events.create, { input: { title: "Next" }, client: { displayName: "Ignored", email: " ADA@example.com " } })
    const clients = await t.query(api.eventContacts.getPrimaryClients, { eventIds: [event.id, reused.id] })
    expect(clients[event.id]).toEqual(clients[reused.id])
    expect(clients[event.id]?.displayName).toBe("Ada")
    expect((await t.query(api.eventContacts.getPanel, { eventId: event.id })).groups[0]?.items[0]?.isPrimary).toBe(true)
    expect((await t.query(api.contacts.search, { limit: 100 })).items).toHaveLength(1)
    await expect(t.mutation(api.events.create, { input: { title: "Rejected" }, client: { email: "bad" } })).rejects.toThrow()
    expect(await t.query(api.events.getUnscheduled, {})).toHaveLength(3)
    expect((await t.query(api.contacts.search, { limit: 100 })).items).toHaveLength(1)
    const contactId = (await t.query(api.contacts.search, { limit: 100 })).items[0]!.id
    await t.mutation(api.contacts.archive, { id: contactId })
    await t.mutation(api.events.create, { input: { title: "New contact" }, client: { displayName: "Replacement", email: "ada@example.com" } })
    expect((await t.query(api.contacts.search, { limit: 100, includeArchived: true })).items).toHaveLength(2)
  })
  it("checks date ranges and patch fields, preserves parents/timestamps and rejects missing events", async () => {
    const t = setup()
    const event = await t.mutation(api.events.create, { input: { startDateTime: "2026-10-10T00:00:00Z", endDateTime: "2026-10-11T00:00:00Z" } })
    await expect(t.mutation(api.events.create, { input: { startDateTime: "2026-10-11T00:00:00Z", endDateTime: "2026-10-10T00:00:00Z" } })).rejects.toThrow("endDateTime")
    await expect(t.mutation(api.events.update, { id: event.id, updates: { startDateTime: "2026-10-12T00:00:00Z" } })).rejects.toThrow("endDateTime")
    await expect(t.mutation(api.events.update, { id: event.id, updates: {} })).rejects.toThrow("Updates are required")
    const updated = await t.mutation(api.events.update, { id: event.id, updates: { title: "Updated", clientNotes: "Notes", endDateTime: null } })
    expect(updated).toMatchObject({ title: "Updated", clientNotes: "Notes", endDateTime: null, startDateTime: event.startDateTime, createdAt: event.createdAt })
    expect(updated.updatedAt).toBeTruthy()
    // @ts-expect-error Creation timestamp belongs to the server.
    await expect(t.mutation(api.events.update, { id: event.id, updates: { createdAt: "fake" } })).rejects.toThrow()
    // @ts-expect-error Server owns event IDs.
    await expect(t.mutation(api.events.create, { input: { id: "fake" } })).rejects.toThrow()
    await t.mutation(api.events.remove, { id: event.id })
    await expect(t.query(api.events.getById, { id: event.id })).rejects.toThrow("record not found")
    await expect(t.mutation(api.events.update, { id: event.id, updates: { title: "Gone" } })).rejects.toThrow("record not found")
    await expect(t.mutation(api.events.remove, { id: event.id })).rejects.toThrow("record not found")
  })
  it("uses indexed start ranges and unscheduled creation order, deduplicating calendar lookup inputs", async () => {
    const t = setup()
    const first = await t.mutation(api.events.create, { input: { title: "First", startDateTime: "2026-10-01T00:00:00Z", calendarId: "calendar" } })
    const second = await t.mutation(api.events.create, { input: { title: "Second", startDateTime: "2026-11-01T00:00:00Z" } })
    const unscheduled = await t.mutation(api.events.create, { input: { title: "Unscheduled" } })
    expect(await t.query(api.events.getStartingBetween, { startFrom: "2026-10-01T00:00:00Z", startTo: "2026-11-01T00:00:00Z" })).toEqual([first])
    expect(await t.query(api.events.getUnscheduled, {})).toEqual([unscheduled])
    expect(await t.query(api.events.getByCalendarIds, { calendarIds: [" calendar ", "calendar", "", "missing"] })).toEqual([first])
    expect(await t.query(api.events.getByCalendarIds, { calendarIds: [] })).toEqual([])
    await expect(t.query(api.events.getStartingBetween, { startFrom: "bad", startTo: second.startDateTime! })).rejects.toThrow("Invalid event start range")
    await expect(t.query(api.events.getStartingBetween, { startFrom: second.startDateTime!, startTo: first.startDateTime! })).rejects.toThrow()
  })
  it("imports atomically, rechecks existing/batch calendar IDs and validates rows", async () => {
    const t = setup()
    const row = { calendarId: "calendar", title: "Dinner", startDateTime: "2026-10-10T00:00:00Z", endDateTime: "2026-10-10T03:00:00Z", internalNotes: "All day" }
    expect(await t.mutation(api.events.importFromCalendar, { rows: [] })).toEqual({ inserted: [], duplicateCalendarIds: [] })
    const result = await t.mutation(api.events.importFromCalendar, { rows: [row, row, { ...row, calendarId: "other" }] })
    expect(result.inserted).toHaveLength(2)
    expect(result.duplicateCalendarIds).toEqual(["calendar"])
    expect(result.inserted[0]).toMatchObject({ type: "function", status: "new_lead", internalNotes: "All day" })
    expect(result.inserted[0]?.createdAt).toBe(result.inserted[1]?.createdAt)
    expect((await t.mutation(api.events.importFromCalendar, { rows: [row] })).duplicateCalendarIds).toEqual(["calendar"])
    for (const invalid of [{ ...row, calendarId: " " }, { ...row, calendarId: "bad", title: " " }, { ...row, calendarId: "bad", startDateTime: "invalid" }, { ...row, calendarId: "bad", endDateTime: "2026-10-09T00:00:00Z" }]) {
      await expect(t.mutation(api.events.importFromCalendar, { rows: [{ ...row, calendarId: "rollback" }, invalid] })).rejects.toThrow()
      expect(await t.query(api.events.getByCalendarIds, { calendarIds: ["rollback"] })).toEqual([])
    }
  })
  it("preserves search relevance, literal matching, client joins, filters and exact pagination totals", async () => {
    const t = setup()
    const one = await t.mutation(api.events.create, { input: { title: "Wedding party", startDateTime: "2026-10-15T00:00:00Z" } })
    const two = await t.mutation(api.events.create, { input: { title: "A wedding", startDateTime: "2026-10-10T00:00:00Z", status: "confirmed" } })
    const three = await t.mutation(api.events.create, { input: { title: "Client name", type: "tournament" }, client: { displayName: "Wedding client" } })
    const four = await t.mutation(api.events.create, { input: { title: "Email" }, client: { displayName: "Email client", email: "wedding@example.com", phone: "123456" } })
    const removed = await t.mutation(api.events.create, { input: { title: "Removed" }, client: { displayName: "Wedding removed" } })
    const assignment = (await t.run(ctx => ctx.db.query("eventContacts").withIndex("by_event", q => q.eq("eventId", removed.id)).first()))!
    await t.mutation(api.eventContacts.remove, { id: assignment._id })
    const params = { query: " Wedding ", page: 0, pageSize: 2, type: null, status: null, startFrom: null, startTo: null }
    expect(await t.query(api.events.search, params)).toMatchObject({ items: [one, two], total: 4, page: 0, pageSize: 2, hasMore: true })
    expect(await t.query(api.events.search, { ...params, page: 1 })).toMatchObject({ items: [three, four], total: 4, hasMore: false })
    expect((await t.query(api.events.search, { ...params, type: "tournament" })).items).toEqual([three])
    expect((await t.query(api.events.search, { ...params, status: "confirmed" })).items).toEqual([two])
    expect((await t.query(api.events.search, { ...params, startFrom: "2026-10-01T00:00:00Z", startTo: "2026-10-15T00:00:00Z" })).items).toEqual([two])
    expect((await t.query(api.events.search, { ...params, query: "2345" })).items).toEqual([four])
    const literal = await t.mutation(api.events.create, { input: { title: "50%_off" } })
    expect((await t.query(api.events.search, { ...params, query: "%_" })).items).toEqual([literal])
    await expect(t.query(api.events.search, { ...params, query: "x" })).rejects.toThrow("at least 2")
    await expect(t.query(api.events.search, { ...params, startFrom: "bad" })).rejects.toThrow("Invalid search date")
    await expect(t.query(api.events.search, { ...params, startFrom: "2026-11-01", startTo: "2026-10-01" })).rejects.toThrow("Invalid event start range")
    expect(await t.query(api.events.search, { ...params, page: 100 })).toMatchObject({ items: [], total: 4, hasMore: false })
  })
  it("cascades every dependent document and link, preserving other events and shared contacts/categories", async () => {
    const t = setup()
    const deleted = await t.mutation(api.events.create, { input: { title: "Delete" }, client: { displayName: "Shared", email: "shared@example.com" } })
    const kept = await t.mutation(api.events.create, { input: { title: "Keep" }, client: { displayName: "Ignored", email: "shared@example.com" } })
    const category = await t.mutation(api.vendorCategories.create, { input: { key: "test", label: "Test", colorToken: "sky" } })
    for (const event of [deleted, kept]) {
      await t.mutation(api.payments.create, { eventId: event.id })
      await t.mutation(api.touchpoints.create, { eventId: event.id })
      await t.mutation(api.menuOfChargeItems.create, { eventId: event.id })
      await t.mutation(api.cartDetails.ensureByEventId, { eventId: event.id })
      await t.mutation(api.tournamentDetails.ensureByEventId, { eventId: event.id })
      const food = await t.mutation(api.timeblocks.create, { eventId: event.id, sectionType: "food" })
      await t.mutation(api.foodItems.create, { timeblockId: food.id, name: "Dinner" })
      const beverage = await t.mutation(api.timeblocks.create, { eventId: event.id, sectionType: "beverage" })
      await t.mutation(api.beverageItems.createAssignedToTimeblock, { eventId: event.id, timeblockId: beverage.id, name: "Wine", type: "Wine" })
      const vendor = await t.mutation(api.eventContacts.assign, { eventId: event.id, target: { newContact: { displayName: event.title + " vendor" } }, role: "vendor", opts: { vendorCategoryId: category.id } })
      await t.mutation(api.eventContacts.remove, { id: vendor.id })
    }
    await t.mutation(api.events.remove, { id: deleted.id })
    await t.run(async ctx => {
      for (const table of ["payments", "touchpoints", "menuOfChargeItems", "cartDetails", "tournamentDetails", "beverageItems"] as const) {
        const rows = await ctx.db.query(table).collect()
        expect(rows).toHaveLength(1)
        expect(rows[0]?.eventId).toBe(kept.id)
      }
      expect(await ctx.db.query("timeblocks").collect()).toHaveLength(2)
      expect(await ctx.db.query("foodItems").collect()).toHaveLength(1)
      expect(await ctx.db.query("beverageItemTimeblocks").collect()).toHaveLength(1)
      const assignments = await ctx.db.query("eventContacts").collect()
      expect(assignments).toHaveLength(2)
      expect(assignments.every(r => r.eventId === kept.id)).toBe(true)
      expect(await ctx.db.query("contacts").collect()).toHaveLength(3)
      expect(await ctx.db.query("contactRoles").collect()).toHaveLength(3)
      expect(await ctx.db.query("vendorCategories").collect()).toHaveLength(1)
    })
  })
})
