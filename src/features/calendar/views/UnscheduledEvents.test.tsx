import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { Event } from "~/definitions/database"
import UnscheduledEvents from "./UnscheduledEvents"

const navigateMock = vi.fn()

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router")
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

function makeEvent(id: string): Event {
  return {
    id,
    title: `Event ${id}`,
    type: "function",
    status: "new_lead",
    startDateTime: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: null,
    clientName: "Client Name",
  } as Event
}

function renderUnscheduledEvents({
  events = [makeEvent("event-1")],
  onEventEdit,
  onEventDelete,
}: {
  events?: Event[]
  onEventEdit?: (event: Event) => void
  onEventDelete?: (eventId: string) => void
} = {}) {
  return render(
    <MemoryRouter initialEntries={["/events?view=calendar&date=2026-04"]}>
      <UnscheduledEvents
        events={events}
        onEventEdit={onEventEdit}
        onEventDelete={onEventDelete}
      />
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("UnscheduledEvents", () => {
  it("navigates to detail page when item is left-clicked", () => {
    renderUnscheduledEvents()

    fireEvent.click(screen.getByRole("button", { name: /Event event-1/i }))

    expect(navigateMock).toHaveBeenCalledWith("/events/event-1", {
      state: { returnTo: "/events?view=calendar&date=2026-04" },
    })
  })

  it("opens context menu on right-click and triggers edit/delete callbacks", () => {
    const onEventEdit = vi.fn()
    const onEventDelete = vi.fn()
    const event = makeEvent("event-1")
    renderUnscheduledEvents({
      events: [event],
      onEventEdit,
      onEventDelete,
    })

    fireEvent.contextMenu(screen.getByRole("button", { name: /Event event-1/i }))
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }))
    expect(onEventEdit).toHaveBeenCalledWith(event)
    expect(navigateMock).not.toHaveBeenCalled()

    fireEvent.contextMenu(screen.getByRole("button", { name: /Event event-1/i }))
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }))
    expect(onEventDelete).toHaveBeenCalledWith(event.id)
    expect(navigateMock).not.toHaveBeenCalled()
  })
})
