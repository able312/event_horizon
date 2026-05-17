import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { toast } from "sonner"
import { describe, expect, it, vi } from "vitest"

import EventDetailHeaderBar from "./EventDetailHeaderBar"
import type { EventResource } from "../types"
import type { Event } from "~/definitions/database"

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "event-1",
    title: "Example Dinner",
    type: "function",
    status: "planning",
    startDateTime: "2026-05-12T18:30:00.000Z",
    endDateTime: "2026-05-12T21:00:00.000Z",
    clientName: "Example Name",
    clientEmail: "example.name@nocompany.com",
    clientPhone: "2265551234",
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

  it("renders create when the event has no calendar id", () => {
    const eventResource = makeEventResource({
      event: makeEvent({ calendarId: null }),
    })

    render(
      <MemoryRouter>
        <EventDetailHeaderBar eventResource={eventResource} />
      </MemoryRouter>,
    )

    expect(screen.getByRole("button", { name: "Create" })).toBeTruthy()
  })

  it("renders update when the event has a calendar id", () => {
    const eventResource = makeEventResource({
      event: makeEvent({ calendarId: "abc123" }),
    })

    render(
      <MemoryRouter>
        <EventDetailHeaderBar eventResource={eventResource} />
      </MemoryRouter>,
    )

    expect(screen.getByRole("button", { name: "Update" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Calendar ID actions" })).toBeTruthy()
  })

  it("disables create when start or end date is missing", () => {
    const eventResource = makeEventResource({
      event: makeEvent({ startDateTime: null }),
    })

    render(
      <MemoryRouter>
        <EventDetailHeaderBar eventResource={eventResource} />
      </MemoryRouter>,
    )

    expect(screen.getByRole("button", { name: "Create" }).hasAttribute("disabled")).toBe(true)
  })

  it("reveals the calendar id input after create succeeds", async () => {
    const eventResource = makeEventResource()

    render(
      <MemoryRouter>
        <EventDetailHeaderBar eventResource={eventResource} />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole("button", { name: "Create" }))

    await waitFor(() => {
      expect(window.electron.ipcRenderer.invoke).toHaveBeenCalledWith(
        "system:open-external",
        expect.stringContaining("https://calendar.google.com/calendar/u/0/r/eventedit"),
      )
    })
    expect(screen.getByPlaceholderText("Paste Google Calendar ID")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Create" })).toBeNull()
  })

  it("shows an error and does not save a blank calendar id", async () => {
    const updateEvent = vi.fn(async () => makeEvent())
    const eventResource = makeEventResource({ updateEvent })

    render(
      <MemoryRouter>
        <EventDetailHeaderBar eventResource={eventResource} />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole("button", { name: "Create" }))
    await screen.findByPlaceholderText("Paste Google Calendar ID")

    fireEvent.change(screen.getByPlaceholderText("Paste Google Calendar ID"), {
      target: { value: "   " },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(toast.error).toHaveBeenCalledWith("Calendar ID is required")
    expect(updateEvent).not.toHaveBeenCalled()
    expect(screen.getByPlaceholderText("Paste Google Calendar ID")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Create" })).toBeNull()
  })

  it("saves a trimmed calendar id", async () => {
    const updateEvent = vi.fn(async (updates) => ({ ...makeEvent(), ...updates }))
    const eventResource = makeEventResource({ updateEvent })

    render(
      <MemoryRouter>
        <EventDetailHeaderBar eventResource={eventResource} />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole("button", { name: "Create" }))
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
