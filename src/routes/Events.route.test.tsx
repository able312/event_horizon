import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"
import EventsRoute from "./Events"

const workspaceMountedMock = vi.fn()

vi.mock("~/features/calendar/CalendarWorkspace", () => ({
  default: () => (
    <div data-testid="calendar-workspace-route">
      <button
        type="button"
        onClick={() => workspaceMountedMock("interaction")}
      >
        Open create panel
      </button>
    </div>
  ),
}))

describe("Events route", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("renders calendar workspace on /events", () => {
    render(
      <MemoryRouter initialEntries={["/events"]}>
        <Routes>
          <Route path="/events" element={<EventsRoute />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByTestId("calendar-workspace-route")).toBeTruthy()
  })

  it("keeps route interaction wiring intact", () => {
    render(
      <MemoryRouter initialEntries={["/events"]}>
        <Routes>
          <Route path="/events" element={<EventsRoute />} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole("button", { name: "Open create panel" }))
    expect(workspaceMountedMock).toHaveBeenCalledWith("interaction")
  })
})
