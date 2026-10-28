import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { describe, expect, it, vi } from "vitest"

import EventDetailHeaderBar from "./EventDetailHeaderBar"
import type { EventResource } from "../types"
import type { Event } from "~/definitions/database"

vi.mock("~/hooks/useUsers", () => ({
  useUsers: () => ({ data: [{ id: "user-1", name: "Sam Staff", email: "sam@westlinks.ca" }] }),
}))

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "event-1",
    title: "Example Dinner",
    type: "function",
    status: "confirmed",
    startDateTime: "2026-05-12T18:30:00.000Z",
    endDateTime: "2026-05-12T21:00:00.000Z",
    minGuests: 80,
    maxGuests: 120,
    guestCountFinal: 0,
    driveFolderId: null,
    calendarId: null,
    clientNotes: null,
    internalNotes: "Sample note for testing.",
    isInternal: 0,
    createdAt: "1715550000000",
    updatedAt: null,
    ...overrides,
  }
}

function makeEventResource(overrides: Partial<EventResource> = {}): EventResource {
  return {
    event: makeEvent(),
    isLoading: false,
    updateEvent: vi.fn(async (updates) => ({ ...makeEvent(), ...updates })),
    deleteEvent: vi.fn(async () => true),
    ...overrides,
  }
}

describe("EventDetailHeaderBar", () => {
  it("renders a back to events link", () => {
    const eventResource = makeEventResource()

    render(
      <MemoryRouter>
        <EventDetailHeaderBar eventResource={eventResource} />
      </MemoryRouter>,
    )

    expect(screen.getByRole("link", { name: /Back to Events/i })).toBeTruthy()
  })

  it.each([
    ["/events?date=2026-10&view=inbox", "Back to Inbox"],
    ["/contacts/contact-1?search=Jane", "Back to Contact"],
    ["/contacts?search=Jane", "Back to Contacts"],
    ["/preview/event-1?type=timeline&resume=ticket", "Back to Print Preview"],
  ])("returns to %s", (returnTo, label) => {
    render(
      <MemoryRouter initialEntries={[`/events/event-1/overview?returnTo=${encodeURIComponent(returnTo)}`]}>
        <EventDetailHeaderBar eventResource={makeEventResource()} />
      </MemoryRouter>,
    )
    expect(screen.getByRole("link", { name: label }).getAttribute("href")).toBe(returnTo)
  })

  it("shows who last edited the event, when known", () => {
    const { rerender } = render(
      <MemoryRouter>
        <EventDetailHeaderBar eventResource={makeEventResource()} />
      </MemoryRouter>,
    )
    expect(screen.queryByText(/Last edited by/)).toBeNull()

    rerender(
      <MemoryRouter>
        <EventDetailHeaderBar
          eventResource={makeEventResource({ event: makeEvent({ updatedBy: "user-1", updatedAt: "1715550000000" }) })}
        />
      </MemoryRouter>,
    )
    expect(screen.getByText(/^Last edited by Sam Staff · /)).toBeTruthy()
  })
})
