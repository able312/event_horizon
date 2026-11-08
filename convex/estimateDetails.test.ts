import { convexTest } from "convex-test"
import { describe, expect, it } from "vitest"

import { api } from "./_generated/api"
import { companyIdentity } from "./lib/testIdentity"
import schema from "./schema"

const modules = import.meta.glob("./**/*.{ts,js}")

async function setup() {
  const t = convexTest(schema, modules).withIdentity(companyIdentity)
  const insertEvent = (title: string) => t.run((ctx) => ctx.db.insert("events", {
    title, type: "function", status: "new_lead",
    startDateTime: "2026-10-25T02:00:00.000Z", endDateTime: null,
    minGuests: null, maxGuests: null, guestCountFinal: null,
    driveFolderId: null, calendarId: null, clientNotes: null, internalNotes: null,
    isInternal: 0, createdAt: "1790812800000", updatedAt: null,
  }))
  const eventId = await insertEvent("Team dinner")
  const otherEventId = await insertEvent("Other event")
  const missingEventId = await insertEvent("Deleted")
  await t.run((ctx) => ctx.db.delete("events", missingEventId))
  return { t, eventId, otherEventId, missingEventId }
}

describe("estimate details", () => {
  it("uses explicit idempotent initialization with defaults and read-only queries", async () => {
    const { t, eventId } = await setup()
    await expect(t.query(api.estimateDetails.getByEventId, { eventId })).rejects.toThrow("details not found")
    expect(await t.run((ctx) => ctx.db.query("estimateDetails").collect())).toEqual([])
    const first = await t.mutation(api.estimateDetails.ensureByEventId, { eventId })
    expect(first).toMatchObject({
      eventId, introNote: null, validUntil: null, terms: null, depositKind: "none",
      depositAmountCents: null, depositPercent: null, depositDueDate: null, depositNote: null,
      createdAt: expect.any(String), updatedAt: null,
    })
    expect(await t.mutation(api.estimateDetails.ensureByEventId, { eventId })).toEqual(first)
    expect(await t.query(api.estimateDetails.getByEventId, { eventId })).toEqual(first)
    expect(await t.run((ctx) => ctx.db.query("estimateDetails").collect())).toHaveLength(1)
  })

  it("patches fields and the server timestamp without changing another event", async () => {
    const { t, eventId, otherEventId } = await setup()
    const record = await t.mutation(api.estimateDetails.ensureByEventId, { eventId })
    const other = await t.mutation(api.estimateDetails.ensureByEventId, { eventId: otherEventId })
    const updates = {
      introNote: "Thanks for choosing us", validUntil: "2026-12-01", terms: "",
      depositKind: "percent" as const, depositPercent: 25, depositDueDate: "2026-11-15", depositNote: "Non-refundable; holds the date",
    }
    const updated = await t.mutation(api.estimateDetails.update, { id: record.id, updates })
    expect(updated).toMatchObject({ ...record, ...updates, updatedAt: expect.any(String) })
    expect(Number.isNaN(Date.parse(updated.updatedAt!))).toBe(false)
    expect(await t.query(api.estimateDetails.getByEventId, { eventId: otherEventId })).toEqual(other)

    const amount = await t.mutation(api.estimateDetails.update, { id: record.id, updates: { depositKind: "amount", depositAmountCents: 50000, terms: null, validUntil: null } })
    expect(amount).toMatchObject({ depositKind: "amount", depositAmountCents: 50000, depositPercent: 25, terms: null, validUntil: null })
  })

  it("accepts the edges of the allowed ranges", async () => {
    const { t, eventId } = await setup()
    const { id } = await t.mutation(api.estimateDetails.ensureByEventId, { eventId })
    for (const updates of [{ depositAmountCents: 0 }, { depositPercent: 0 }, { depositPercent: 100 }, { depositPercent: 12.5 }, { depositDueDate: null }]) {
      expect(await t.mutation(api.estimateDetails.update, { id, updates })).toMatchObject(updates)
    }
  })

  it("rejects invalid amounts, percents and dates without writing", async () => {
    const { t, eventId } = await setup()
    const record = await t.mutation(api.estimateDetails.ensureByEventId, { eventId })
    const { id } = record
    for (const updates of [{ depositAmountCents: -1 }, { depositAmountCents: 10.5 }, { depositAmountCents: Number.NaN }]) {
      await expect(t.mutation(api.estimateDetails.update, { id, updates })).rejects.toThrow("depositAmountCents")
    }
    for (const updates of [{ depositPercent: -1 }, { depositPercent: 100.01 }, { depositPercent: Number.NaN }]) {
      await expect(t.mutation(api.estimateDetails.update, { id, updates })).rejects.toThrow("depositPercent")
    }
    for (const value of ["", "2026-1-01", "12/01/2026", "2026-12-01T00:00:00Z"]) {
      await expect(t.mutation(api.estimateDetails.update, { id, updates: { validUntil: value } })).rejects.toThrow("validUntil")
      await expect(t.mutation(api.estimateDetails.update, { id, updates: { depositDueDate: value } })).rejects.toThrow("depositDueDate")
    }
    // @ts-expect-error Exercise runtime enum validation.
    await expect(t.mutation(api.estimateDetails.update, { id, updates: { depositKind: "half" } })).rejects.toThrow()
    expect(await t.query(api.estimateDetails.getByEventId, { eventId })).toEqual(record)
  })

  it("rejects missing parents, empty patches, and missing records", async () => {
    const { t, eventId, missingEventId } = await setup()
    await expect(t.mutation(api.estimateDetails.ensureByEventId, { eventId: missingEventId })).rejects.toThrow("record not found")
    const { id } = await t.mutation(api.estimateDetails.ensureByEventId, { eventId })
    await expect(t.mutation(api.estimateDetails.update, { id, updates: {} })).rejects.toThrow("Updates are required")
    await t.run((ctx) => ctx.db.delete("estimateDetails", id))
    await expect(t.mutation(api.estimateDetails.update, { id, updates: { introNote: "Hi" } })).rejects.toThrow("record not found")
  })

  it("is deleted with its event", async () => {
    const { t, eventId, otherEventId } = await setup()
    await t.mutation(api.estimateDetails.ensureByEventId, { eventId })
    const kept = await t.mutation(api.estimateDetails.ensureByEventId, { eventId: otherEventId })
    await t.mutation(api.events.remove, { id: eventId })
    expect((await t.run((ctx) => ctx.db.query("estimateDetails").collect())).map((row) => row._id)).toEqual([kept.id])
  })
})
