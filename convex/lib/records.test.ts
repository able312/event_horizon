import { convexTest } from "convex-test"
import { describe, expect, it } from "vitest"

import schema from "../schema"
import { toRecord } from "./records"

const modules = import.meta.glob("../**/*.{ts,js}")

const eventFields = {
  title: "Team tournament",
  type: "tournament",
  status: "confirmed",
  startDateTime: "2026-10-08T09:00:00Z",
  endDateTime: null,
  minGuests: 0,
  maxGuests: 100,
  guestCountFinal: null,
  driveFolderId: null,
  calendarId: "calendar-event",
  clientNotes: "",
  internalNotes: "Arrange carts",
  isInternal: 0,
  createdAt: "2026-10-01T12:00:00Z",
  updatedAt: null,
} as const

describe("toRecord", () => {
  it("renames the document id and preserves every stored field without mutating the document", async () => {
    const t = convexTest(schema, modules)

    const doc = await t.run(async (ctx) => {
      const id = await ctx.db.insert("events", eventFields)
      return ctx.db.get(id)
    })
    if (!doc) throw new Error("Inserted event was not found")
    const original = structuredClone(doc)

    const record = toRecord(doc)

    expect(record).toEqual({ id: doc._id, ...eventFields })
    expect(record).not.toHaveProperty("_id")
    expect(record).not.toHaveProperty("_creationTime")
    expect(doc).toEqual(original)
  })

  it("preserves foreign ids, booleans, and nested cart grids", async () => {
    const t = convexTest(schema, modules)
    const doc = await t.run(async (ctx) => {
      const eventId = await ctx.db.insert("events", eventFields)
      const id = await ctx.db.insert("cartDetails", {
        eventId,
        time: null,
        layout: "custom",
        customGrid: [[1, "Lead", null], [], [0, ""]],
        whatGoesOnCarts: null,
        assignedTo: "Team",
        rentingCarts: false,
        createdAt: "2026-10-01T12:00:00Z",
        updatedAt: null,
      })
      return ctx.db.get(id)
    })
    if (!doc) throw new Error("Inserted cart details were not found")

    expect(toRecord(doc)).toEqual({
      id: doc._id,
      eventId: doc.eventId,
      time: null,
      layout: "custom",
      customGrid: [[1, "Lead", null], [], [0, ""]],
      whatGoesOnCarts: null,
      assignedTo: "Team",
      rentingCarts: false,
      createdAt: "2026-10-01T12:00:00Z",
      updatedAt: null,
    })
  })
})
