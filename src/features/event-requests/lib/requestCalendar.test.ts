import { describe, expect, it } from "vitest"

import type { Event } from "~/definitions/database"
import { getBookedEvents, getRequestCalendarDates, getRequestCalendarMonth } from "./requestCalendar"

const NOW = new Date(2026, 9, 18)

describe("getRequestCalendarDates", () => {
  it("reads both dates as local calendar days", () => {
    const dates = getRequestCalendarDates({ preferredDate: "2027-06-20", alternateDate: "2027-07-04" })

    expect(dates.preferred).toEqual(new Date(2027, 5, 20))
    expect(dates.alternate).toEqual(new Date(2027, 6, 4))
  })

  it("returns null for missing or unreadable dates", () => {
    const dates = getRequestCalendarDates({ preferredDate: null, alternateDate: "sometime in June" })

    expect(dates).toEqual({ preferred: null, alternate: null })
  })
})

describe("getRequestCalendarMonth", () => {
  it("opens on the preferred date's month", () => {
    const month = getRequestCalendarMonth({ preferred: new Date(2027, 5, 20), alternate: new Date(2027, 8, 1) }, NOW)
    expect(month).toBe("2027-06")
  })

  it("falls back to the alternate date's month", () => {
    expect(getRequestCalendarMonth({ preferred: null, alternate: new Date(2027, 8, 1) }, NOW)).toBe("2027-09")
  })

  it("falls back to the current month when the client gave no date", () => {
    expect(getRequestCalendarMonth({ preferred: null, alternate: null }, NOW)).toBe("2026-10")
  })
})

describe("getBookedEvents", () => {
  it("leaves out lost events", () => {
    const events = (["new_lead", "tentative", "confirmed", "closed", "lost"] as const).map(
      (status) => ({ id: status, status }) as Event,
    )

    expect(getBookedEvents(events).map((event) => event.id)).toEqual(["new_lead", "tentative", "confirmed", "closed"])
  })
})
