import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { Event } from "~/definitions/database"
import type { EventResource } from "~/features/event-detail/types"

import OverviewWorkspaceSection from "./OverviewWorkspaceSection"

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "event-1",
    title: "Example Dinner",
    type: "function",
    status: "planning",
    startDateTime: "2026-08-12T18:30:00.000Z",
    endDateTime: "2026-08-12T21:00:00.000Z",
    clientName: "Example Name",
    clientEmail: "example@example.com",
    clientPhone: "2265551234",
    minGuests: 80,
    maxGuests: 120,
    guestCountFinal: 0,
    driveFolderId: null,
    calendarId: null,
    clientNotes: null,
    internalNotes: "Saved notes",
    isInternal: 0,
    createdAt: "1715550000000",
    updatedAt: null,
    ...overrides,
  }
}

function makeEventResource(overrides: Partial<EventResource> = {}): EventResource {
  const event = overrides.event ?? makeEvent()

  return {
    event,
    isLoading: false,
    updateEvent: vi.fn(async (updates) => ({ ...event, ...updates })),
    deleteEvent: vi.fn(async () => true),
    ...overrides,
  }
}

describe("OverviewWorkspaceSection", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it.each([
    ["the event is loading", makeEventResource({ isLoading: true })],
    ["the event is absent", makeEventResource({ event: undefined })],
  ])("keeps editable fields unmounted while %s", (_description, eventResource) => {
    const { container } = render(
      <OverviewWorkspaceSection eventResource={eventResource} />,
    )

    expect(screen.queryByRole("textbox")).toBeNull()
    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(3)
  })

  it("renders saved internal notes when event data is loaded", () => {
    render(<OverviewWorkspaceSection eventResource={makeEventResource()} />)

    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("Saved notes")
  })

  it("re-seeds the controlled notes draft when the event identity changes", () => {
    const firstResource = makeEventResource()
    const { rerender } = render(
      <OverviewWorkspaceSection eventResource={firstResource} />,
    )

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Unsaved draft" },
    })
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("Unsaved draft")

    const nextResource = makeEventResource({
      event: makeEvent({
        id: "event-2",
        title: "Second Event",
        internalNotes: "Second event notes",
      }),
    })
    rerender(<OverviewWorkspaceSection eventResource={nextResource} />)

    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("Second event notes")
  })
})
