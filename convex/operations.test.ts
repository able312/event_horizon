import { convexTest } from "convex-test"
import { describe, expect, it } from "vitest"

import { internal } from "./_generated/api"
import schema from "./schema"

const modules = import.meta.glob("./**/*.{ts,js}")

async function setup() {
  const t = convexTest(schema, modules)
  const insertEvent = (title: string) => t.run((ctx) => ctx.db.insert("events", {
    title,
    type: "function",
    status: "new_lead",
    startDateTime: "2026-10-25T02:00:00.000Z",
    endDateTime: null,
    minGuests: null,
    maxGuests: null,
    guestCountFinal: null,
    driveFolderId: null,
    calendarId: null,
    clientNotes: null,
    internalNotes: null,
    isInternal: 0,
    createdAt: "1790812800000",
    updatedAt: null,
  }))
  const eventId = await insertEvent("Team dinner")
  const otherEventId = await insertEvent("Other event")
  const missingEventId = await insertEvent("Deleted")
  await t.run((ctx) => ctx.db.delete("events", missingEventId))
  return { t, eventId, otherEventId, missingEventId }
}

describe("payments", () => {
  it("returns every payment for an event, including an empty result", async () => {
    const { t, eventId, otherEventId } = await setup()
    expect(await t.query(internal.payments.getByEventId, { eventId })).toEqual([])
    const first = await t.mutation(internal.payments.create, { eventId })
    const second = await t.mutation(internal.payments.create, { eventId })
    await t.mutation(internal.payments.create, { eventId: otherEventId })
    expect(await t.query(internal.payments.getByEventId, { eventId })).toEqual([first, second])
    expect(await t.query(internal.payments.getAll, {})).toHaveLength(3)
    expect(first).toMatchObject({ eventId, amountCents: 0, recieptNumber: "", notes: "" })
    expect(first.date).toBe(first.createdAt)
    expect(first).not.toHaveProperty("_id")
  })

  it("patches editable fields and deletes, preserving creation time", async () => {
    const { t, eventId } = await setup()
    const record = await t.mutation(internal.payments.create, { eventId })
    const updated = await t.mutation(internal.payments.update, {
      id: record.id, updates: { amountCents: 12500, recieptNumber: null, notes: "Deposit" },
    })
    expect(updated).toEqual({ ...record, amountCents: 12500, recieptNumber: null, notes: "Deposit" })
    expect(await t.mutation(internal.payments.remove, { id: record.id })).toBe(true)
    expect(await t.query(internal.payments.getByEventId, { eventId })).toEqual([])
    await expect(t.mutation(internal.payments.update, { id: record.id, updates: { notes: "Gone" } })).rejects.toThrow("record not found")
    await expect(t.mutation(internal.payments.remove, { id: record.id })).rejects.toThrow("record not found")
  })

  it("rejects orphan creates, empty patches, reassignment, and client timestamps", async () => {
    const { t, eventId, otherEventId, missingEventId } = await setup()
    await expect(t.mutation(internal.payments.create, { eventId: missingEventId })).rejects.toThrow("record not found")
    const { id } = await t.mutation(internal.payments.create, { eventId })
    await expect(t.mutation(internal.payments.update, { id, updates: {} })).rejects.toThrow("Updates are required")
    // @ts-expect-error Exercise runtime validation of untrusted fields.
    await expect(t.mutation(internal.payments.update, { id, updates: { eventId: otherEventId } })).rejects.toThrow()
    // @ts-expect-error Creation time belongs to the server.
    await expect(t.mutation(internal.payments.update, { id, updates: { createdAt: "fake" } })).rejects.toThrow()
  })
})

describe("menu of charge items", () => {
  it("creates with defaults and optional category, and isolates event queries", async () => {
    const { t, eventId, otherEventId } = await setup()
    expect(await t.query(internal.menuOfChargeItems.getByEventId, { eventId })).toEqual([])
    const first = await t.mutation(internal.menuOfChargeItems.create, { eventId })
    const second = await t.mutation(internal.menuOfChargeItems.create, { eventId, category: "Food & Beverage" })
    await t.mutation(internal.menuOfChargeItems.create, { eventId: otherEventId })
    expect(first).toMatchObject({ eventId, name: "", quantity: 0, category: null, includes: "", unitPriceCents: 0 })
    expect(second.category).toBe("Food & Beverage")
    expect(await t.query(internal.menuOfChargeItems.getByEventId, { eventId })).toEqual([first, second])
  })

  it("patches nullable fields and rejects operations on deleted items", async () => {
    const { t, eventId } = await setup()
    const record = await t.mutation(internal.menuOfChargeItems.create, { eventId })
    expect(await t.mutation(internal.menuOfChargeItems.update, {
      id: record.id, updates: { name: "Dinner", quantity: null, includes: null, unitPriceCents: 4500 },
    })).toEqual({ ...record, name: "Dinner", quantity: null, includes: null, unitPriceCents: 4500 })
    expect(await t.mutation(internal.menuOfChargeItems.remove, { id: record.id })).toBe(true)
    expect(await t.query(internal.menuOfChargeItems.getByEventId, { eventId })).toEqual([])
    await expect(t.mutation(internal.menuOfChargeItems.update, { id: record.id, updates: { name: "Gone" } })).rejects.toThrow("record not found")
    await expect(t.mutation(internal.menuOfChargeItems.remove, { id: record.id })).rejects.toThrow("record not found")
  })

  it("rejects orphan creates, empty patches, and invalid categories", async () => {
    const { t, eventId, missingEventId } = await setup()
    await expect(t.mutation(internal.menuOfChargeItems.create, { eventId: missingEventId })).rejects.toThrow("record not found")
    const { id } = await t.mutation(internal.menuOfChargeItems.create, { eventId })
    await expect(t.mutation(internal.menuOfChargeItems.update, { id, updates: {} })).rejects.toThrow("Updates are required")
    // @ts-expect-error Exercise runtime enum validation.
    await expect(t.mutation(internal.menuOfChargeItems.update, { id, updates: { category: "unknown" } })).rejects.toThrow()
  })
})

describe("cart details", () => {
  it("uses explicit idempotent initialization and read-only queries", async () => {
    const { t, eventId } = await setup()
    await expect(t.query(internal.cartDetails.getByEventId, { eventId })).rejects.toThrow("details not found")
    expect(await t.run((ctx) => ctx.db.query("cartDetails").collect())).toEqual([])
    const first = await t.mutation(internal.cartDetails.ensureByEventId, { eventId })
    expect(first).toMatchObject({ eventId, layout: "template-12-hole-shotgun", customGrid: null, rentingCarts: false, updatedAt: null })
    expect(await t.mutation(internal.cartDetails.ensureByEventId, { eventId })).toEqual(first)
    expect(await t.query(internal.cartDetails.getByEventId, { eventId })).toEqual(first)
    expect(await t.run((ctx) => ctx.db.query("cartDetails").collect())).toHaveLength(1)
  })

  it("patches grids and server timestamps without changing another event", async () => {
    const { t, eventId, otherEventId } = await setup()
    const record = await t.mutation(internal.cartDetails.ensureByEventId, { eventId })
    const other = await t.mutation(internal.cartDetails.ensureByEventId, { eventId: otherEventId })
    const updated = await t.mutation(internal.cartDetails.update, {
      id: record.id, updates: { layout: "custom", customGrid: [[1, "Lead", null]], rentingCarts: true },
    })
    expect(updated).toMatchObject({ ...record, layout: "custom", customGrid: [[1, "Lead", null]], rentingCarts: true, updatedAt: expect.any(String) })
    expect(Number.isNaN(Date.parse(updated.updatedAt!))).toBe(false)
    expect(await t.query(internal.cartDetails.getByEventId, { eventId: otherEventId })).toEqual(other)
    expect((await t.mutation(internal.cartDetails.update, { id: record.id, updates: { customGrid: null } })).customGrid).toBeNull()
  })

  it("rejects missing parents, empty patches, and missing records", async () => {
    const { t, eventId, missingEventId } = await setup()
    await expect(t.mutation(internal.cartDetails.ensureByEventId, { eventId: missingEventId })).rejects.toThrow("record not found")
    const { id } = await t.mutation(internal.cartDetails.ensureByEventId, { eventId })
    await expect(t.mutation(internal.cartDetails.update, { id, updates: {} })).rejects.toThrow("Updates are required")
    await t.run((ctx) => ctx.db.delete("cartDetails", id))
    await expect(t.mutation(internal.cartDetails.update, { id, updates: { time: "10:00" } })).rejects.toThrow("record not found")
  })
})

describe("tournament details", () => {
  it("initializes once with defaults and keeps queries read-only", async () => {
    const { t, eventId } = await setup()
    await expect(t.query(internal.tournamentDetails.getByEventId, { eventId })).rejects.toThrow("details not found")
    expect(await t.run((ctx) => ctx.db.query("tournamentDetails").collect())).toEqual([])
    const record = await t.mutation(internal.tournamentDetails.ensureByEventId, { eventId })
    expect(record).toMatchObject({ eventId, startFormat: "Shotgun", playFormat: "Scramble", numberOfPlayers: null, updatedAt: null })
    expect(await t.mutation(internal.tournamentDetails.ensureByEventId, { eventId })).toEqual(record)
    expect(await t.query(internal.tournamentDetails.getByEventId, { eventId })).toEqual(record)
    expect(await t.run((ctx) => ctx.db.query("tournamentDetails").collect())).toHaveLength(1)
  })

  it("patches details and preserves server-owned fields and other events", async () => {
    const { t, eventId, otherEventId } = await setup()
    const record = await t.mutation(internal.tournamentDetails.ensureByEventId, { eventId })
    const other = await t.mutation(internal.tournamentDetails.ensureByEventId, { eventId: otherEventId })
    expect(await t.mutation(internal.tournamentDetails.update, {
      id: record.id, updates: { numberOfPlayers: 72, notes: "Lead carts", startFormat: null },
    })).toMatchObject({ ...record, numberOfPlayers: 72, notes: "Lead carts", startFormat: null, updatedAt: expect.any(String) })
    expect(await t.query(internal.tournamentDetails.getByEventId, { eventId: otherEventId })).toEqual(other)
  })

  it("rejects missing parents, empty patches, invalid enums, and missing records", async () => {
    const { t, eventId, missingEventId } = await setup()
    await expect(t.mutation(internal.tournamentDetails.ensureByEventId, { eventId: missingEventId })).rejects.toThrow("record not found")
    const { id } = await t.mutation(internal.tournamentDetails.ensureByEventId, { eventId })
    await expect(t.mutation(internal.tournamentDetails.update, { id, updates: {} })).rejects.toThrow("Updates are required")
    // @ts-expect-error Exercise runtime enum validation.
    await expect(t.mutation(internal.tournamentDetails.update, { id, updates: { playFormat: "unknown" } })).rejects.toThrow()
    await t.run((ctx) => ctx.db.delete("tournamentDetails", id))
    await expect(t.mutation(internal.tournamentDetails.update, { id, updates: { notes: "Gone" } })).rejects.toThrow("record not found")
  })
})

describe("touchpoints", () => {
  it("filters completion and joins the event title across events", async () => {
    const { t, eventId, otherEventId } = await setup()
    expect(await t.query(internal.touchpoints.getByEventId, { eventId })).toEqual([])
    const open = await t.mutation(internal.touchpoints.create, { eventId })
    expect(open).toMatchObject({ eventId, title: "", dueDate: null, completedAt: null })
    const done = await t.mutation(internal.touchpoints.create, { eventId, values: { title: "Done", completedAt: "2026-10-08T12:00:00Z" } })
    const other = await t.mutation(internal.touchpoints.create, { eventId: otherEventId, values: { title: "Other" } })
    expect(await t.query(internal.touchpoints.getByEventId, { eventId })).toEqual([open, done])
    expect(await t.query(internal.touchpoints.getIncompleteByEventId, { eventId })).toEqual([open])
    expect(await t.query(internal.touchpoints.getIncompleteWithEvent, {})).toEqual([
      { ...open, eventTitle: "Team dinner" }, { ...other, eventTitle: "Other event" },
    ])
  })

  it("updates, reopens, and removes touchpoints", async () => {
    const { t, eventId } = await setup()
    const record = await t.mutation(internal.touchpoints.create, { eventId })
    expect(await t.mutation(internal.touchpoints.update, { id: record.id, updates: { title: "Confirm", completedAt: "2026-10-08T12:00:00Z" } })).toEqual({ ...record, title: "Confirm", completedAt: "2026-10-08T12:00:00Z" })
    expect(await t.query(internal.touchpoints.getIncompleteByEventId, { eventId })).toEqual([])
    await t.mutation(internal.touchpoints.update, { id: record.id, updates: { completedAt: null } })
    expect(await t.query(internal.touchpoints.getIncompleteByEventId, { eventId })).toHaveLength(1)
    expect(await t.mutation(internal.touchpoints.remove, { id: record.id })).toBe(true)
    await expect(t.mutation(internal.touchpoints.update, { id: record.id, updates: { title: "Gone" } })).rejects.toThrow("record not found")
    await expect(t.mutation(internal.touchpoints.remove, { id: record.id })).rejects.toThrow("record not found")
  })

  it("seeds the existing templates using the client's calendar date", async () => {
    const { t, eventId } = await setup()
    const seeded = await t.mutation(internal.touchpoints.seedCommon, { eventId, timeZone: "America/Toronto" })
    expect(seeded.map((row) => [row.title, row.dueDate])).toEqual([
      ["Confirm booking", "2026-10-06T00:00:00.000Z"],
      ["Confirm menu choices & dietary restrictions", "2026-10-10T00:00:00.000Z"],
      ["Final guest count", "2026-10-17T00:00:00.000Z"],
    ])
    expect(await t.query(internal.touchpoints.getByEventId, { eventId })).toEqual(seeded)
    expect(seeded.every((row) => row.completedAt === null)).toBe(true)
  })

  it("rejects missing parents and empty updates; seed failures roll back the batch", async () => {
    const { t, eventId, missingEventId } = await setup()
    await expect(t.mutation(internal.touchpoints.create, { eventId: missingEventId })).rejects.toThrow("record not found")
    await expect(t.mutation(internal.touchpoints.seedCommon, { eventId: missingEventId, timeZone: "UTC" })).rejects.toThrow("record not found")
    await expect(t.mutation(internal.touchpoints.seedCommon, { eventId, timeZone: "invalid-zone" })).rejects.toThrow()
    expect(await t.query(internal.touchpoints.getByEventId, { eventId })).toEqual([])
    await t.run((ctx) => ctx.db.patch("events", eventId, { startDateTime: "invalid" }))
    await expect(t.mutation(internal.touchpoints.seedCommon, { eventId, timeZone: "UTC" })).rejects.toThrow("Invalid event startDateTime")
    const { id } = await t.mutation(internal.touchpoints.create, { eventId })
    await expect(t.mutation(internal.touchpoints.update, { id, updates: {} })).rejects.toThrow("Updates are required")
  })

  it("seeds unscheduled events relative to today in the client's zone", async () => {
    const { t, eventId } = await setup()
    await t.run((ctx) => ctx.db.patch("events", eventId, { startDateTime: null }))
    const seeded = await t.mutation(internal.touchpoints.seedCommon, { eventId, timeZone: "UTC" })
    const due = new Date(seeded[0].createdAt)
    due.setUTCDate(due.getUTCDate() - 18)
    expect(seeded[0].dueDate).toBe(`${due.toISOString().slice(0, 10)}T00:00:00.000Z`)
  })
})
