import { describe, expect, it } from "vitest"

import type { Event } from "~/definitions/database"
import { getDayKey, getEventStatusDotClass, groupEventsByDay } from "./miniCalendarDays"

function makeEvent(overrides: Partial<Event>): Event {
  return {
    id: "event-id",
    title: "Event",
    type: "function",
    status: "confirmed",
    startDateTime: "2026-04-10T12:00:00",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: null,
    ...overrides,
  } as Event
}

describe("getDayKey", () => {
  it("formats a local date as yyyy-MM-dd", () => {
    expect(getDayKey(new Date(2026, 0, 5))).toBe("2026-01-05")
  })
})

describe("groupEventsByDay", () => {
  it("groups events by their local start day, earliest first", () => {
    const evening = makeEvent({ id: "evening", startDateTime: "2026-04-10T18:00:00" })
    const morning = makeEvent({ id: "morning", startDateTime: "2026-04-10T09:00:00" })
    const nextDay = makeEvent({ id: "next", startDateTime: "2026-04-11T09:00:00" })

    const eventsByDay = groupEventsByDay([evening, nextDay, morning])

    expect(eventsByDay.get("2026-04-10")?.map((event) => event.id)).toEqual(["morning", "evening"])
    expect(eventsByDay.get("2026-04-11")?.map((event) => event.id)).toEqual(["next"])
  })

  it("keeps days from different months apart", () => {
    const eventsByDay = groupEventsByDay([
      makeEvent({ id: "march", startDateTime: "2026-03-31T12:00:00" }),
      makeEvent({ id: "april", startDateTime: "2026-04-01T12:00:00" }),
    ])

    expect([...eventsByDay.keys()]).toEqual(["2026-03-31", "2026-04-01"])
  })

  it("leaves out undated and unparseable events", () => {
    const eventsByDay = groupEventsByDay([
      makeEvent({ id: "undated", startDateTime: null }),
      makeEvent({ id: "bad", startDateTime: "not a date" }),
    ])

    expect(eventsByDay.size).toBe(0)
  })
})

describe("getEventStatusDotClass", () => {
  it("styles the dot by event status", () => {
    expect(getEventStatusDotClass("new_lead")).toBe("size-[5px] rotate-45 rounded-[1px] bg-status-new-bg")
    expect(getEventStatusDotClass("tentative")).toBe("border-[1.5px] border-status-tentative-glyph")
    expect(getEventStatusDotClass("confirmed")).toBe("bg-status-confirmed-fg")
    expect(getEventStatusDotClass("closed")).toBe("bg-status-complete-glyph")
  })

  it("falls back to a neutral colour for unknown statuses", () => {
    expect(getEventStatusDotClass("archived")).toBe("bg-stone-500")
  })
})
