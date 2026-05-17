import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import EventsRoute from "./Events"

const calendarWorkspaceMock = vi.fn()

vi.mock("~/features/calendar/CalendarWorkspace", () => ({
  default: () => calendarWorkspaceMock(),
}))

describe("EventsRoute", () => {
  it("shows route error boundary fallback when calendar workspace throws", () => {
    calendarWorkspaceMock.mockImplementation(() => {
      throw new Error("render crash")
    })

    render(<EventsRoute />)

    expect(screen.getByText("Something went wrong")).toBeTruthy()
    expect(
      screen.getByText("The Events page hit an unexpected issue. Please reload and try again."),
    ).toBeTruthy()
  })
})
