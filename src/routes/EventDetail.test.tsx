import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import EventDetailRoute from "./EventDetail"

const eventDetailWorkspaceMock = vi.fn()

vi.mock("~/features/event-detail/EventDetailWorkspace", () => ({
  default: () => eventDetailWorkspaceMock(),
}))

describe("EventDetailRoute", () => {
  it("shows route error boundary fallback when event detail workspace throws", () => {
    eventDetailWorkspaceMock.mockImplementation(() => {
      throw new Error("render crash")
    })

    render(<EventDetailRoute />)

    expect(screen.getByText("Something went wrong")).toBeTruthy()
    expect(
      screen.getByText("The Event Detail page hit an unexpected issue. Please reload and try again."),
    ).toBeTruthy()
  })
})
