import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { Event } from "~/definitions/database"
import RequestMiniCalendar from "./RequestMiniCalendar"

let monthEvents: Event[] = []
const requestedMonths: string[] = []

vi.mock("~/features/calendar/hooks/useAdjacentMonthsEvents", () => ({
  useAdjacentMonthsEvents: (month: string) => {
    requestedMonths.push(month)
    return monthEvents
  },
}))

function makeEvent(overrides: Partial<Event>): Event {
  return {
    id: "event-id",
    title: "Event",
    type: "function",
    status: "confirmed",
    startDateTime: "2027-06-12T12:00:00",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: null,
    ...overrides,
  } as Event
}

function getDay(dayKey: string): HTMLElement | null {
  return document.querySelector(`button[data-mini-day="${dayKey}"]`)
}

afterEach(() => {
  cleanup()
  monthEvents = []
  requestedMonths.length = 0
})

describe("RequestMiniCalendar", () => {
  it("opens on the preferred date's month and marks both requested days", () => {
    render(<RequestMiniCalendar request={{ preferredDate: "2027-06-20", alternateDate: "2027-06-27" }} />)

    expect(screen.getByText("June 2027")).toBeTruthy()
    expect(requestedMonths[requestedMonths.length - 1]).toBe("2027-06")
    expect(getDay("2027-06-20")?.getAttribute("data-request-day")).toBe("preferred")
    expect(getDay("2027-06-27")?.getAttribute("data-request-day")).toBe("alternate")
    expect(getDay("2027-06-21")?.hasAttribute("data-request-day")).toBe(false)
  })

  it("marks booked events, including on neighbouring months' days, but not lost ones", () => {
    monthEvents = [
      makeEvent({ id: "booked", startDateTime: "2027-06-12T12:00:00" }),
      makeEvent({ id: "lost", status: "lost", startDateTime: "2027-06-13T12:00:00" }),
      makeEvent({ id: "next-month", startDateTime: "2027-07-01T12:00:00" }),
    ]

    render(<RequestMiniCalendar request={{ preferredDate: "2027-06-20", alternateDate: null }} />)

    expect(getDay("2027-06-12")?.querySelector("[data-mini-marker-dot]")).toBeTruthy()
    expect(getDay("2027-06-13")?.querySelector("[data-mini-marker]")).toBeNull()
    expect(getDay("2027-07-01")?.querySelector("[data-mini-marker-dot]")).toBeTruthy()
  })

  it("offers a way back after flipping to another month", () => {
    render(<RequestMiniCalendar request={{ preferredDate: "2027-06-20", alternateDate: null }} />)

    expect(screen.queryByRole("button", { name: "Back to requested date" })).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: /next month/i }))
    expect(screen.getByText("July 2027")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Back to requested date" }))
    expect(screen.getByText("June 2027")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Back to requested date" })).toBeNull()
  })

  it("explains an empty calendar when the client gave no date", () => {
    render(<RequestMiniCalendar request={{ preferredDate: null, alternateDate: null }} />)

    expect(screen.getByText("The client didn't give a date.")).toBeTruthy()
    expect(document.querySelector("[data-request-day]")).toBeNull()
  })
})
