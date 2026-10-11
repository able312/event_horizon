import { describe, expect, it } from "vitest"

import type { Event } from "../../definitions/database"
import { buildTimelineRows } from "./buildTimelineRows"

const event: Event = {
  id: "event", title: "Dinner", type: "function", status: "new_lead",
  startDateTime: null, endDateTime: null, createdAt: "1790812800000", updatedAt: null,
  minGuests: null, maxGuests: null, guestCountFinal: null, isInternal: 0,
  driveFolderId: null, calendarId: null, clientNotes: null, internalNotes: null,
}

function build(startDateTime: string, timeZone?: string) {
  return buildTimelineRows({
    event: { ...event, startDateTime }, persistedTimeblocks: [],
    rawTournamentDetails: null, rawCartDetails: null, timeZone,
  })
}

describe("buildTimelineRows date conversion", () => {
  it.each([
    ["2026-11-01T05:30:00Z", "01:30"],
    ["2026-11-01T06:30:00Z", "01:30"],
    ["2026-03-08T06:30:00Z", "01:30"],
    ["2026-03-08T07:30:00Z", "03:30"],
    ["2026-10-25T04:00:00Z", "00:00"],
  ])("uses Toronto wall time across midnight and DST: %s", (date, time) => {
    expect(build(date, "America/Toronto")[0]).toMatchObject({ time, createdAt: event.createdAt })
  })

  it("uses desktop local time when no time zone is supplied", () => {
    const date = "2026-10-25T02:15:00Z"
    const parsed = new Date(date)
    const time = `${String(parsed.getHours()).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(2, "0")}`
    expect(build(date)[0]?.time).toBe(time)
  })

  it("omits missing and invalid event dates", () => {
    expect(build("", "UTC")).toEqual([])
    expect(build("invalid", "UTC")).toEqual([])
  })
})
