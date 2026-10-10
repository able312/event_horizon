import { convexTest } from "convex-test"
import { describe, expect, it } from "vitest"

import { api } from "./_generated/api"
import type { Id } from "./_generated/dataModel"
import { AUDITED_TABLES, STAMPED_UPDATED_AT_TABLES, auditedWriter } from "./lib/audit"
import { companyIdentity } from "./lib/testIdentity"
import schema from "./schema"

const modules = import.meta.glob("./**/*.{ts,js}")

const otherIdentity = { subject: "user_other", issuer: "https://api.workos.com/", email: "other@westlinks.ca", name: "Olive Other" }

const newTest = () => convexTest(schema, modules)

async function userIdFor(t: Pick<ReturnType<ReturnType<typeof newTest>["withIdentity"]>, "run">, workosUserId: string): Promise<Id<"users">> {
  const user = await t.run((ctx) => ctx.db.query("users").withIndex("by_workosUserId", (q) => q.eq("workosUserId", workosUserId)).unique())
  if (!user) throw new Error(`no user for ${workosUserId}`)
  return user._id
}

describe("audit fields", () => {
  it("covers every business table, so a new table can't silently skip auditing", () => {
    const unaudited = ["users", "beverageItemTimeblocks"]
    expect([...AUDITED_TABLES].sort()).toEqual(Object.keys(schema.tables).filter((table) => !unaudited.includes(table)).sort())
    for (const table of STAMPED_UPDATED_AT_TABLES) expect(AUDITED_TABLES).toContain(table)
  })

  it("records the creator and last editor from the signed-in account, creating the user if needed", async () => {
    const t = newTest()
    const asStaff = t.withIdentity(companyIdentity)
    const asOther = t.withIdentity(otherIdentity)

    // No users.store call first: the mutation still attributes the write.
    const event = await asStaff.mutation(api.events.create, { input: { title: "Gala" } })
    const staffId = await userIdFor(t, companyIdentity.subject)
    expect(event).toMatchObject({ createdBy: staffId, updatedBy: staffId })

    const updated = await asOther.mutation(api.events.update, { id: event.id, updates: { status: "confirmed" } })
    const otherId = await userIdFor(t, otherIdentity.subject)
    expect(updated).toMatchObject({ createdBy: staffId, updatedBy: otherId, status: "confirmed" })
    expect(updated.updatedAt).not.toBeNull()
  })

  it("stamps updatedAt on tables that had none, on create and on every edit", async () => {
    const t = newTest().withIdentity(companyIdentity)
    const event = await t.mutation(api.events.create, { input: { title: "Gala" } })
    const payment = await t.mutation(api.payments.create, { eventId: event.id })
    expect(Date.parse(payment.updatedAt ?? "")).not.toBeNaN()

    await t.run((ctx) => ctx.db.patch("payments", payment.id, { updatedAt: "2000-01-01T00:00:00.000Z" }))
    const updated = await t.mutation(api.payments.update, { id: payment.id, updates: { amountCents: 500 } })
    expect(updated.updatedAt).not.toBe("2000-01-01T00:00:00.000Z")
  })

  it("stamps writes made inside shared helpers (event creation assigning a new client contact)", async () => {
    const t = newTest().withIdentity(companyIdentity)
    const event = await t.mutation(api.events.create, { input: { title: "Gala" }, client: { firstName: "Ada", lastName: "Client" } })
    const staffId = await userIdFor(t, companyIdentity.subject)
    const [contacts, roles, assignments] = await t.run(async (ctx) => [
      await ctx.db.query("contacts").collect(),
      await ctx.db.query("contactRoles").collect(),
      await ctx.db.query("eventContacts").withIndex("by_event", (q) => q.eq("eventId", event.id)).collect(),
    ] as const)
    for (const doc of [...contacts, ...roles, ...assignments]) expect(doc).toMatchObject({ createdBy: staffId, updatedBy: staffId })
  })

  it("rejects audit fields sent by the client", async () => {
    const t = newTest().withIdentity(companyIdentity)
    const event = await t.mutation(api.events.create, { input: { title: "Gala" } })
    const otherUser = await t.run((ctx) => ctx.db.insert("users", { workosUserId: "user_x", email: "x@westlinks.ca", name: null, createdAt: "", updatedAt: "" }))
    // @ts-expect-error Audit fields are not part of any mutation's input.
    await expect(t.mutation(api.events.update, { id: event.id, updates: { updatedBy: otherUser } })).rejects.toThrow()
    // @ts-expect-error Audit fields are not part of any mutation's input.
    await expect(t.mutation(api.events.create, { input: { title: "Forged", createdBy: otherUser } })).rejects.toThrow()
  })

  it("doesn't re-stamp a record when its edit sets no fields", async () => {
    const t = newTest()
    const event = await t.withIdentity(companyIdentity).mutation(api.events.create, { input: { title: "Gala" }, client: { firstName: "Ada" } })
    const [assignment] = await t.run((ctx) => ctx.db.query("eventContacts").collect())
    const before = await t.run((ctx) => ctx.db.get("contacts", assignment.contactId))

    await t.withIdentity(otherIdentity).mutation(api.eventContacts.updateWithContact, {
      id: assignment._id, contactPatch: {}, assignmentPatch: { notes: "Arrives 5pm" },
    })
    const otherId = await userIdFor(t, otherIdentity.subject)
    expect(await t.run((ctx) => ctx.db.get("contacts", assignment.contactId))).toEqual(before)
    expect(await t.run((ctx) => ctx.db.get("eventContacts", assignment._id))).toMatchObject({ notes: "Arrives 5pm", updatedBy: otherId })

    await t.withIdentity(otherIdentity).mutation(api.contacts.update, { id: assignment.contactId, patch: {} })
    expect(await t.run((ctx) => ctx.db.get("contacts", assignment.contactId))).toEqual(before)
    expect(event.id).toBe(assignment.eventId)
  })

  it("leaves link rows unaudited", async () => {
    const t = newTest().withIdentity(companyIdentity)
    const event = await t.mutation(api.events.create, { input: { title: "Gala" } })
    const bar = await t.mutation(api.timeblocks.create, { eventId: event.id, sectionType: "beverage" })
    const item = await t.mutation(api.beverageItems.create, { eventId: event.id, name: "Red", type: "Wine" })
    await t.mutation(api.beverageItems.setItemTimeblocks, { itemId: item.id, timeblockIds: [bar.id] })
    const [link] = await t.run((ctx) => ctx.db.query("beverageItemTimeblocks").collect())
    expect(link).not.toHaveProperty("createdBy")
  })

  it("refuses writes that can't name their table", async () => {
    const t = newTest()
    const userId = await t.run((ctx) => ctx.db.insert("users", { workosUserId: "user_x", email: "x@westlinks.ca", name: null, createdAt: "", updatedAt: "" }))
    await t.run(async (ctx) => {
      const db = auditedWriter(ctx.db, userId)
      const withTable = db as unknown as { table: (name: string) => unknown }
      expect(() => withTable.table("events")).toThrow(/bypasses audit/)
      expect(() => db.patch(userId, { name: "x" })).toThrow(/must name its table/)
      expect(() => db.replace(userId, { workosUserId: "user_x", email: "x@westlinks.ca", name: null, createdAt: "", updatedAt: "" })).toThrow(/must name its table/)
    })
  })
})

describe("users.list", () => {
  it("returns every account's display details", async () => {
    const t = newTest()
    await t.withIdentity({ ...companyIdentity, name: "Sam Staff" }).mutation(api.users.store, {})
    await t.withIdentity(otherIdentity).mutation(api.users.store, {})
    const users = await t.withIdentity(companyIdentity).query(api.users.list, {})
    expect(users.map(({ name, email }) => ({ name, email })).sort((a, b) => a.email.localeCompare(b.email))).toEqual([
      { name: "Olive Other", email: "other@westlinks.ca" },
      { name: "Sam Staff", email: "staff@westlinks.ca" },
    ])
  })
})
