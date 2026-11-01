import { describe, expect, it } from "vitest"

import {
  buildUndatedEventTouchpoint,
  dueDateDaysFrom,
  needsUndatedEventTouchpoint,
  UNDATED_EVENT_TOUCHPOINT_TITLE,
} from "./undatedEventTouchpoint"

const dated = { startDateTime: "2026-12-05T18:00:00.000Z" }
const undated = { startDateTime: null }

describe("needsUndatedEventTouchpoint", () => {
  it("is needed for an event created without a date", () => {
    expect(needsUndatedEventTouchpoint(null, { ...undated, status: "new_lead" })).toBe(true)
  })

  it("is needed when an event's date is removed", () => {
    expect(needsUndatedEventTouchpoint(dated, { ...undated, status: "new_lead" })).toBe(true)
  })

  it("isn't needed for dated events or edits to an already undated event", () => {
    expect(needsUndatedEventTouchpoint(null, { ...dated, status: "new_lead" })).toBe(false)
    expect(needsUndatedEventTouchpoint(undated, { ...dated, status: "tentative" })).toBe(false)
    expect(needsUndatedEventTouchpoint(undated, { ...undated, status: "new_lead" })).toBe(false)
  })

  it("isn't needed for lost events", () => {
    expect(needsUndatedEventTouchpoint(null, { ...undated, status: "lost" })).toBe(false)
    expect(needsUndatedEventTouchpoint(dated, { ...undated, status: "lost" })).toBe(false)
  })
})

describe("dueDateDaysFrom", () => {
  it("counts days from today's date in the given time zone", () => {
    // 11pm Oct 31 in Toronto is already Nov 1 in UTC.
    const now = new Date("2026-11-01T03:00:00.000Z")
    expect(dueDateDaysFrom(now, 7, "America/Toronto")).toBe("2026-11-07T00:00:00.000Z")
    expect(dueDateDaysFrom(now, 7, "UTC")).toBe("2026-11-08T00:00:00.000Z")
  })

  it("crosses month and year ends", () => {
    expect(dueDateDaysFrom(new Date("2026-12-28T12:00:00.000Z"), 7, "UTC")).toBe("2027-01-04T00:00:00.000Z")
  })
})

it("builds a reminder due seven days out", () => {
  expect(buildUndatedEventTouchpoint(new Date("2026-11-01T15:00:00.000Z"), "America/Toronto")).toEqual({
    title: UNDATED_EVENT_TOUCHPOINT_TITLE,
    dueDate: "2026-11-08T00:00:00.000Z",
  })
})
