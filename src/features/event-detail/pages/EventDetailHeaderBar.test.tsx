import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import EventDetailHeaderBar from "./EventDetailHeaderBar"
import type { EventResource } from "../types"
import type { Event } from "~/definitions/database"
import { BackendError } from "~/lib/data/backend"
import { pushEventToGoogleCalendar, removeEventFromGoogleCalendar } from "~/lib/data/googleCalendar"

const EVENT_URL = "https://calendar.google.com/calendar/event?eid=abc"
vi.mock("~/lib/data/googleCalendar", () => ({ pushEventToGoogleCalendar: vi.fn(), removeEventFromGoogleCalendar: vi.fn() }))
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

async function chooseGoogleCalendarOption(name: string) {
  fireEvent.pointerDown(screen.getByRole("button", { name: "Google Calendar options" }))
  fireEvent.click(await screen.findByRole("menuitem", { name: new RegExp(`^${name}`) }))
}

describe("EventDetailHeaderBar", () => {
  beforeEach(() => {
    vi.mocked(pushEventToGoogleCalendar).mockResolvedValue({ eventUrl: EVENT_URL })
    vi.mocked(removeEventFromGoogleCalendar).mockResolvedValue({ deletedFromGoogle: true })
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

  it("adds the event to Google Calendar and offers to open it", async () => {
    render(
      <MemoryRouter>
        <EventDetailHeaderBar eventResource={makeEventResource()} />
      </MemoryRouter>,
    )

    await chooseGoogleCalendarOption("Add to Google Calendar")

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Added to Google Calendar", expect.anything())
    })
    expect(pushEventToGoogleCalendar).toHaveBeenCalledWith("event-1")
    expect(window.electron.ipcRenderer.invoke).not.toHaveBeenCalledWith("system:open-external", expect.anything())
    expect(screen.queryByPlaceholderText("Paste Google Calendar event ID or link")).toBeNull()

    const options = vi.mocked(toast.success).mock.calls[0]?.[1] as unknown as { action: { onClick: () => void } }
    options.action.onClick()
    expect(window.electron.ipcRenderer.invoke).toHaveBeenCalledWith("system:open-external", EVENT_URL)
  })

  it("updates the linked Google event", async () => {
    render(
      <MemoryRouter>
        <EventDetailHeaderBar eventResource={makeEventResource({ event: makeEvent({ calendarId: "abc123@google.com" }) })} />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole("button", { name: "Update Event in Google Calendar" }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Google Calendar event updated", expect.anything())
    })
    expect(pushEventToGoogleCalendar).toHaveBeenCalledWith("event-1")
  })

  it("shows the server's explanation when Google Calendar refuses", async () => {
    vi.mocked(pushEventToGoogleCalendar).mockRejectedValue(
      new BackendError("GoogleCalendarAuth", "Event Horizon's access to Google Calendar has expired or was removed."),
    )
    render(
      <MemoryRouter>
        <EventDetailHeaderBar eventResource={makeEventResource({ event: makeEvent({ calendarId: "abc123@google.com" }) })} />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole("button", { name: "Update Event in Google Calendar" }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Event Horizon's access to Google Calendar has expired or was removed.")
    })
    expect(screen.getByRole("button", { name: "Update Event in Google Calendar" }).hasAttribute("disabled")).toBe(false)
  })

  it("shows an error and does not save a blank calendar id", async () => {
    const updateEvent = vi.fn(async () => makeEvent())
    const eventResource = makeEventResource({ updateEvent })

    render(
      <MemoryRouter>
        <EventDetailHeaderBar eventResource={eventResource} />
      </MemoryRouter>,
    )

    await chooseGoogleCalendarOption("Link existing event")

    fireEvent.change(screen.getByPlaceholderText("Paste Google Calendar event ID or link"), {
      target: { value: "   " },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(toast.error).toHaveBeenCalledWith("Calendar ID is required")
    expect(updateEvent).not.toHaveBeenCalled()
    expect(screen.getByPlaceholderText("Paste Google Calendar event ID or link")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Google Calendar options" })).toBeNull()
  })

  it("saves a trimmed calendar id", async () => {
    const updateEvent = vi.fn(async (updates) => ({ ...makeEvent(), ...updates }))
    const eventResource = makeEventResource({ updateEvent })

    render(
      <MemoryRouter>
        <EventDetailHeaderBar eventResource={eventResource} />
      </MemoryRouter>,
    )

    await chooseGoogleCalendarOption("Link existing event")

    fireEvent.change(screen.getByPlaceholderText("Paste Google Calendar event ID or link"), {
      target: { value: "  abc123  " },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(updateEvent).toHaveBeenCalledWith({ calendarId: "abc123" })
    })
    expect(toast.success).toHaveBeenCalledWith("Calendar ID saved")
  })

  it("removes the event from Google Calendar after confirming", async () => {
    const updateEvent = vi.fn(async (updates) => ({ ...makeEvent(), ...updates }))
    render(
      <MemoryRouter>
        <EventDetailHeaderBar eventResource={makeEventResource({ event: makeEvent({ calendarId: "abc123" }), updateEvent })} />
      </MemoryRouter>,
    )

    fireEvent.pointerDown(screen.getByRole("button", { name: "Calendar ID actions" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "Remove from Google Calendar" }))
    expect(removeEventFromGoogleCalendar).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "Remove from Google Calendar" }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Removed from Google Calendar")
    })
    expect(removeEventFromGoogleCalendar).toHaveBeenCalledWith("event-1")
    expect(updateEvent).not.toHaveBeenCalled()
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("keeps the Google event when removal is cancelled", async () => {
    render(
      <MemoryRouter>
        <EventDetailHeaderBar eventResource={makeEventResource({ event: makeEvent({ calendarId: "abc123" }) })} />
      </MemoryRouter>,
    )

    fireEvent.pointerDown(screen.getByRole("button", { name: "Calendar ID actions" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "Remove from Google Calendar" }))
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(removeEventFromGoogleCalendar).not.toHaveBeenCalled()
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("shows the server's explanation when removal fails, keeping the dialog open", async () => {
    vi.mocked(removeEventFromGoogleCalendar).mockRejectedValue(
      new BackendError("GoogleCalendarAuth", "Event Horizon's access to Google Calendar has expired or was removed."),
    )
    render(
      <MemoryRouter>
        <EventDetailHeaderBar eventResource={makeEventResource({ event: makeEvent({ calendarId: "abc123" }) })} />
      </MemoryRouter>,
    )

    fireEvent.pointerDown(screen.getByRole("button", { name: "Calendar ID actions" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "Remove from Google Calendar" }))
    fireEvent.click(screen.getByRole("button", { name: "Remove from Google Calendar" }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Event Horizon's access to Google Calendar has expired or was removed.")
    })
    expect(screen.getByRole("dialog")).toBeTruthy()
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

    const input = screen.getByPlaceholderText("Paste Google Calendar event ID or link") as HTMLInputElement
    expect(input.value).toBe("abc123")
    expect(screen.queryByRole("button", { name: "Update" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Calendar ID actions" })).toBeNull()
  })

  it("links an existing calendar event without opening the browser", async () => {
    const updateEvent = vi.fn(async (updates) => ({ ...makeEvent(), ...updates }))

    render(
      <MemoryRouter>
        <EventDetailHeaderBar eventResource={makeEventResource({ updateEvent })} />
      </MemoryRouter>,
    )

    await chooseGoogleCalendarOption("Link existing event")

    const input = screen.getByPlaceholderText("Paste Google Calendar event ID or link") as HTMLInputElement
    expect(input.value).toBe("")
    expect(window.electron.ipcRenderer.invoke).not.toHaveBeenCalledWith(
      "system:open-external",
      expect.anything(),
    )

    fireEvent.change(input, { target: { value: "existing-id" } })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(updateEvent).toHaveBeenCalledWith({ calendarId: "existing-id" })
    })
  })

  it("returns to the menu when linking is cancelled", async () => {
    render(
      <MemoryRouter>
        <EventDetailHeaderBar eventResource={makeEventResource()} />
      </MemoryRouter>,
    )

    await chooseGoogleCalendarOption("Link existing event")
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(screen.queryByPlaceholderText("Paste Google Calendar event ID or link")).toBeNull()
    expect(screen.getByRole("button", { name: "Google Calendar options" })).toBeTruthy()
  })

  it("disables adding but still allows linking when dates are missing", async () => {
    render(
      <MemoryRouter>
        <EventDetailHeaderBar eventResource={makeEventResource({ event: makeEvent({ endDateTime: null }) })} />
      </MemoryRouter>,
    )

    fireEvent.pointerDown(screen.getByRole("button", { name: "Google Calendar options" }))
    const createItem = await screen.findByRole("menuitem", { name: /^Add to Google Calendar/ })
    expect(createItem.getAttribute("data-disabled")).not.toBeNull()

    fireEvent.click(screen.getByRole("menuitem", { name: "Link existing event" }))
    expect(screen.getByPlaceholderText("Paste Google Calendar event ID or link")).toBeTruthy()
  })
})
