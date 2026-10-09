import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import EventDetailHeaderBar from "./EventDetailHeaderBar"
import type { EventResource } from "../types"
import type { EventContactsPanel } from "~/definitions/contacts"
import type { Event } from "~/definitions/database"

vi.mock("~/lib/data/touchpoints", () => ({ getIncompleteTouchpointsByEventId: vi.fn(async () => []) }))
vi.mock("~/lib/data/eventContacts", () => ({ getEventContactsPanel: vi.fn(async () => contactsPanel) }))

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

const contactsPanel: EventContactsPanel = {
  eventId: "event-1",
  groups: [
    {
      role: "client",
      items: [
        {
          eventContactId: "ec-1",
          contactId: "contact-1",
          displayName: "Example Name",
          initials: "EN",
          email: "example.name@nocompany.com",
          phone: "2265551234",
          roleLabel: null,
          notes: null,
          vendorCategory: null,
          isPrimary: true,
          contactArchived: false,
        },
      ],
    },
    { role: "coordinator", items: [] },
    { role: "vendor", items: [] },
  ],
}

describe("EventDetailHeaderBar", () => {
  beforeEach(() => {
    vi.mocked(window.electron.ipcRenderer.invoke).mockImplementation(async (channel: string) => {
      if (channel === "system:open-external") return undefined
      return undefined
    })
  })

  it("renders a back to events link", () => {
    const eventResource = makeEventResource()

    render(
      <MemoryRouter>
        <EventDetailHeaderBar eventResource={eventResource} />
      </MemoryRouter>,
    )

    expect(screen.getByRole("link", { name: /Back to Events/i })).toBeTruthy()
  })

  it("reveals the calendar id input after create succeeds", async () => {
    const eventResource = makeEventResource()

    render(
      <MemoryRouter>
        <EventDetailHeaderBar eventResource={eventResource} />
      </MemoryRouter>,
    )

    fireEvent.click(
      screen.getByRole("button", { name: "Create Event in Google Calendar" }),
    )

    await waitFor(() => {
      expect(window.electron.ipcRenderer.invoke).toHaveBeenCalledWith(
        "system:open-external",
        expect.stringContaining("https://calendar.google.com/calendar/u/0/r/eventedit"),
      )
    })
    const openedUrl = vi
      .mocked(window.electron.ipcRenderer.invoke)
      .mock.calls.find(([channel]) => channel === "system:open-external")?.[1] as string
    expect(new URL(openedUrl).searchParams.get("details")).toContain("Name: Example Name")
    expect(screen.getByPlaceholderText("Paste Google Calendar ID")).toBeTruthy()
    expect(
      screen.queryByRole("button", { name: "Create Event in Google Calendar" }),
    ).toBeNull()
  })

  it("shows an error and does not save a blank calendar id", async () => {
    const updateEvent = vi.fn(async () => makeEvent())
    const eventResource = makeEventResource({ updateEvent })

    render(
      <MemoryRouter>
        <EventDetailHeaderBar eventResource={eventResource} />
      </MemoryRouter>,
    )

    fireEvent.click(
      screen.getByRole("button", { name: "Create Event in Google Calendar" }),
    )
    await screen.findByPlaceholderText("Paste Google Calendar ID")

    fireEvent.change(screen.getByPlaceholderText("Paste Google Calendar ID"), {
      target: { value: "   " },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(toast.error).toHaveBeenCalledWith("Calendar ID is required")
    expect(updateEvent).not.toHaveBeenCalled()
    expect(screen.getByPlaceholderText("Paste Google Calendar ID")).toBeTruthy()
    expect(
      screen.queryByRole("button", { name: "Create Event in Google Calendar" }),
    ).toBeNull()
  })

  it("saves a trimmed calendar id", async () => {
    const updateEvent = vi.fn(async (updates) => ({ ...makeEvent(), ...updates }))
    const eventResource = makeEventResource({ updateEvent })

    render(
      <MemoryRouter>
        <EventDetailHeaderBar eventResource={eventResource} />
      </MemoryRouter>,
    )

    fireEvent.click(
      screen.getByRole("button", { name: "Create Event in Google Calendar" }),
    )
    await screen.findByPlaceholderText("Paste Google Calendar ID")

    fireEvent.change(screen.getByPlaceholderText("Paste Google Calendar ID"), {
      target: { value: "  abc123  " },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(updateEvent).toHaveBeenCalledWith({ calendarId: "abc123" })
    })
    expect(toast.success).toHaveBeenCalledWith("Calendar ID saved")
  })

  it("removes the stored calendar id", async () => {
    const updateEvent = vi.fn(async (updates) => ({ ...makeEvent(), ...updates }))
    const eventResource = makeEventResource({
      event: makeEvent({ calendarId: "abc123" }),
      updateEvent,
    })

    render(
      <MemoryRouter>
        <EventDetailHeaderBar eventResource={eventResource} />
      </MemoryRouter>,
    )

    fireEvent.pointerDown(screen.getByRole("button", { name: "Calendar ID actions" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "Remove Calendar ID" }))

    await waitFor(() => {
      expect(updateEvent).toHaveBeenCalledWith({ calendarId: null })
    })
    expect(toast.success).toHaveBeenCalledWith("Calendar ID removed")
  })

  it("shows the inline editor when edit calendar id is clicked", async () => {
    const eventResource = makeEventResource({
      event: makeEvent({ calendarId: "abc123" }),
    })

    render(
      <MemoryRouter>
        <EventDetailHeaderBar eventResource={eventResource} />
      </MemoryRouter>,
    )

    fireEvent.pointerDown(screen.getByRole("button", { name: "Calendar ID actions" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "Edit Calendar ID" }))

    const input = screen.getByPlaceholderText("Paste Google Calendar ID") as HTMLInputElement
    expect(input.value).toBe("abc123")
    expect(screen.queryByRole("button", { name: "Update" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Calendar ID actions" })).toBeNull()
  })
})
