import { describe, expect, it } from "vitest"

import type { ContactEventHistory } from "~/definitions/contacts"

import { groupEventHistory, sortEventHistory } from "./eventHistory"

function makeRow(overrides: Partial<ContactEventHistory>): ContactEventHistory {
  return {
    eventContactId: "ec-1",
    eventId: "e-1",
    eventTitle: "Event",
    eventStatus: "confirmed",
    eventStartDateTime: null,
    role: "client",
    vendorCategory: null,
    roleLabel: null,
    isPrimary: false,
    removedAt: null,
    ...overrides,
  }
}

describe("sortEventHistory", () => {
  it("orders scheduled events newest first", () => {
    const rows = [
      makeRow({ eventId: "old", eventStartDateTime: "2025-01-01T00:00:00.000Z" }),
      makeRow({ eventId: "new", eventStartDateTime: "2026-06-01T00:00:00.000Z" }),
    ]
    expect(sortEventHistory(rows).map((r) => r.eventId)).toEqual(["new", "old"])
  })

  it("puts unscheduled events last", () => {
    const rows = [
      makeRow({ eventId: "unscheduled", eventStartDateTime: null }),
      makeRow({ eventId: "scheduled", eventStartDateTime: "2026-01-01T00:00:00.000Z" }),
    ]
    expect(sortEventHistory(rows).map((r) => r.eventId)).toEqual(["scheduled", "unscheduled"])
  })

  it("does not mutate the input array", () => {
    const rows = [makeRow({ eventId: "a" }), makeRow({ eventId: "b" })]
    const original = [...rows]
    sortEventHistory(rows)
    expect(rows).toEqual(original)
  })
})

describe("groupEventHistory", () => {
  const now = new Date("2026-06-01T00:00:00.000Z")

  it("splits events around now", () => {
    const rows = [
      makeRow({ eventId: "past", eventStartDateTime: "2026-05-01T00:00:00.000Z" }),
      makeRow({ eventId: "future", eventStartDateTime: "2026-07-01T00:00:00.000Z" }),
    ]
    const { upcoming, past } = groupEventHistory(rows, now)
    expect(upcoming.map((r) => r.eventId)).toEqual(["future"])
    expect(past.map((r) => r.eventId)).toEqual(["past"])
  })

  it("orders upcoming soonest first with unscheduled last, and past newest first", () => {
    const rows = [
      makeRow({ eventId: "later", eventStartDateTime: "2026-09-01T00:00:00.000Z" }),
      makeRow({ eventId: "unscheduled", eventStartDateTime: null }),
      makeRow({ eventId: "sooner", eventStartDateTime: "2026-07-01T00:00:00.000Z" }),
      makeRow({ eventId: "older", eventStartDateTime: "2025-01-01T00:00:00.000Z" }),
      makeRow({ eventId: "recent", eventStartDateTime: "2026-05-01T00:00:00.000Z" }),
    ]
    const { upcoming, past } = groupEventHistory(rows, now)
    expect(upcoming.map((r) => r.eventId)).toEqual(["sooner", "later", "unscheduled"])
    expect(past.map((r) => r.eventId)).toEqual(["recent", "older"])
  })
})
