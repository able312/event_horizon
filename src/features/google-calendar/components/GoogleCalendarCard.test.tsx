import { QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { GoogleCalendarCard } from "./GoogleCalendarCard"
import { BackendError } from "~/lib/data/backend"
import {
  getGoogleCalendarEventUrl,
  getGoogleCalendarSyncStatus,
  pushEventToGoogleCalendar,
  removeEventFromGoogleCalendar,
} from "~/lib/data/googleCalendar"
import { createTestQueryClient } from "~/test/renderHookWithProviders"

const EVENT_URL = "https://calendar.google.com/calendar/event?eid=abc"
const AUTH_MESSAGE = "Event Horizon's access to Google Calendar has expired or was removed."
const LINK_PLACEHOLDER = "Paste Google Calendar event ID or link"
vi.mock("~/lib/data/googleCalendar", () => ({
  getGoogleCalendarEventUrl: vi.fn(),
  getGoogleCalendarSyncStatus: vi.fn(),
  pushEventToGoogleCalendar: vi.fn(),
  removeEventFromGoogleCalendar: vi.fn(),
}))

type CardEvent = React.ComponentProps<typeof GoogleCalendarCard>["event"]

function makeEvent(overrides: Partial<CardEvent> = {}): CardEvent {
  return {
    id: "event-1",
    calendarId: null,
    startDateTime: "2026-05-12T18:30:00.000Z",
    endDateTime: "2026-05-12T21:00:00.000Z",
    ...overrides,
  }
}

const linked = makeEvent({ calendarId: "abc123@google.com" })

function renderCard(event: CardEvent = makeEvent(), onSaveCalendarId = vi.fn(async () => undefined)) {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <GoogleCalendarCard event={event} onSaveCalendarId={onSaveCalendarId} />
    </QueryClientProvider>,
  )
  return { onSaveCalendarId }
}

async function chooseMenuItem(name: string) {
  fireEvent.pointerDown(screen.getByRole("button", { name: "More Google Calendar actions" }))
  fireEvent.click(await screen.findByRole("menuitem", { name }))
}

describe("GoogleCalendarCard", () => {
  beforeEach(() => {
    vi.mocked(pushEventToGoogleCalendar).mockResolvedValue({ eventUrl: EVENT_URL })
    vi.mocked(getGoogleCalendarEventUrl).mockResolvedValue({ eventUrl: EVENT_URL })
    vi.mocked(getGoogleCalendarSyncStatus).mockResolvedValue("unknown")
    vi.mocked(removeEventFromGoogleCalendar).mockResolvedValue({ deletedFromGoogle: true })
    vi.mocked(window.electron.ipcRenderer.invoke).mockResolvedValue(undefined)
  })

  it("adds the event to Google Calendar and offers to open it", async () => {
    renderCard()
    expect(screen.getByText("Not on the shared calendar yet")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Add to Google Calendar" }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Added to Google Calendar", expect.anything())
    })
    expect(pushEventToGoogleCalendar).toHaveBeenCalledWith("event-1")
    expect(window.electron.ipcRenderer.invoke).not.toHaveBeenCalledWith("system:open-external", expect.anything())

    const options = vi.mocked(toast.success).mock.calls[0]?.[1] as unknown as { action: { onClick: () => void } }
    options.action.onClick()
    expect(window.electron.ipcRenderer.invoke).toHaveBeenCalledWith("system:open-external", EVENT_URL)
  })

  it("explains why adding is disabled when dates are missing, but still allows linking", async () => {
    renderCard(makeEvent({ endDateTime: null }))

    expect(screen.getByText("Set a start and end time to add it")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Add to Google Calendar" }).hasAttribute("disabled")).toBe(true)

    await chooseMenuItem("Link existing event…")
    expect(screen.getByPlaceholderText(LINK_PLACEHOLDER)).toBeTruthy()
  })

  it("updates the linked Google event", async () => {
    renderCard(linked)
    expect(await screen.findByText("On the shared calendar. Update to track changes")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Update Google Calendar event" }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Google Calendar event updated", expect.anything())
    })
    expect(pushEventToGoogleCalendar).toHaveBeenCalledWith("event-1")
  })

  it("calls out changes Google doesn't have yet", async () => {
    vi.mocked(getGoogleCalendarSyncStatus).mockResolvedValue("out_of_date")
    renderCard(linked)

    expect(await screen.findByText("Has changes not on Google Calendar yet")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Update Google Calendar event" }))

    await waitFor(() => {
      expect(pushEventToGoogleCalendar).toHaveBeenCalledWith("event-1")
    })
  })

  it("hides Update once Google is up to date, keeping it in the menu", async () => {
    vi.mocked(getGoogleCalendarSyncStatus).mockResolvedValue("synced")
    renderCard(linked)

    expect(await screen.findByText("Up to date on the shared calendar")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Update Google Calendar event" })).toBeNull()

    await chooseMenuItem("Update anyway")
    await waitFor(() => {
      expect(pushEventToGoogleCalendar).toHaveBeenCalledWith("event-1")
    })
  })

  it("shows the server's explanation when Google Calendar refuses", async () => {
    vi.mocked(pushEventToGoogleCalendar).mockRejectedValue(new BackendError("GoogleCalendarAuth", AUTH_MESSAGE))
    renderCard(linked)

    fireEvent.click(screen.getByRole("button", { name: "Update Google Calendar event" }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(AUTH_MESSAGE)
    })
    expect(screen.getByRole("button", { name: "Update Google Calendar event" }).hasAttribute("disabled")).toBe(false)
  })

  it("hides unexpected errors behind a friendly message", async () => {
    vi.mocked(pushEventToGoogleCalendar).mockRejectedValue(new Error("[CONVEX A(googleCalendar:pushEvent)] Server Error"))
    renderCard(linked)

    fireEvent.click(screen.getByRole("button", { name: "Update Google Calendar event" }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to update Google Calendar")
    })
  })

  it("opens the linked Google event without updating it", async () => {
    renderCard(linked)

    fireEvent.click(screen.getByRole("button", { name: "Open in Google Calendar" }))

    await waitFor(() => {
      expect(window.electron.ipcRenderer.invoke).toHaveBeenCalledWith("system:open-external", EVENT_URL)
    })
    expect(getGoogleCalendarEventUrl).toHaveBeenCalledWith("event-1")
    expect(pushEventToGoogleCalendar).not.toHaveBeenCalled()
  })

  it("explains when the linked Google event can't be opened", async () => {
    vi.mocked(getGoogleCalendarEventUrl).mockRejectedValue(
      new BackendError("GoogleCalendarEventNotFound", "The linked Google Calendar event isn't on the shared calendar."),
    )
    renderCard(linked)

    fireEvent.click(screen.getByRole("button", { name: "Open in Google Calendar" }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("The linked Google Calendar event isn't on the shared calendar.")
    })
    expect(window.electron.ipcRenderer.invoke).not.toHaveBeenCalledWith("system:open-external", expect.anything())
  })

  it("links an existing event with a trimmed ID, without opening the browser", async () => {
    const { onSaveCalendarId } = renderCard()

    await chooseMenuItem("Link existing event…")
    const input = screen.getByPlaceholderText(LINK_PLACEHOLDER) as HTMLInputElement
    expect(input.value).toBe("")
    fireEvent.change(input, { target: { value: "  existing-id  " } })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(onSaveCalendarId).toHaveBeenCalledWith({ calendarId: "existing-id" })
    })
    expect(window.electron.ipcRenderer.invoke).not.toHaveBeenCalledWith("system:open-external", expect.anything())
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(LINK_PLACEHOLDER)).toBeNull()
    })
  })

  it("shows an error and does not save a blank calendar id", async () => {
    const { onSaveCalendarId } = renderCard()

    await chooseMenuItem("Link existing event…")
    fireEvent.change(screen.getByPlaceholderText(LINK_PLACEHOLDER), { target: { value: "   " } })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(toast.error).toHaveBeenCalledWith("Calendar ID is required")
    expect(onSaveCalendarId).not.toHaveBeenCalled()
    expect(screen.getByPlaceholderText(LINK_PLACEHOLDER)).toBeTruthy()
  })

  it("changes the linked event, starting from the current ID", async () => {
    renderCard(linked)

    await chooseMenuItem("Change linked event…")

    const input = screen.getByPlaceholderText(LINK_PLACEHOLDER) as HTMLInputElement
    expect(input.value).toBe("abc123@google.com")
    expect(screen.queryByRole("button", { name: "Update Google Calendar event" })).toBeNull()
  })

  it("returns to the actions when linking is cancelled", async () => {
    renderCard()

    await chooseMenuItem("Link existing event…")
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(screen.queryByPlaceholderText(LINK_PLACEHOLDER)).toBeNull()
    expect(screen.getByRole("button", { name: "Add to Google Calendar" })).toBeTruthy()
  })

  it("disconnects the linked event without touching Google", async () => {
    const { onSaveCalendarId } = renderCard(linked)

    await chooseMenuItem("Disconnect (keep Google event)")

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Disconnected. The Google event is still on the shared calendar")
    })
    expect(onSaveCalendarId).toHaveBeenCalledWith({ calendarId: null })
    expect(removeEventFromGoogleCalendar).not.toHaveBeenCalled()
  })

  it("removes the event from Google Calendar after confirming", async () => {
    const { onSaveCalendarId } = renderCard(linked)

    await chooseMenuItem("Remove from Google Calendar")
    expect(removeEventFromGoogleCalendar).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "Remove from Google Calendar" }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Removed from Google Calendar")
    })
    expect(removeEventFromGoogleCalendar).toHaveBeenCalledWith("event-1")
    expect(onSaveCalendarId).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull()
    })
  })

  it("keeps the Google event when removal is cancelled", async () => {
    renderCard(linked)

    await chooseMenuItem("Remove from Google Calendar")
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(removeEventFromGoogleCalendar).not.toHaveBeenCalled()
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("shows the server's explanation when removal fails, keeping the dialog open", async () => {
    vi.mocked(removeEventFromGoogleCalendar).mockRejectedValue(new BackendError("GoogleCalendarAuth", AUTH_MESSAGE))
    renderCard(linked)

    await chooseMenuItem("Remove from Google Calendar")
    fireEvent.click(screen.getByRole("button", { name: "Remove from Google Calendar" }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(AUTH_MESSAGE)
    })
    expect(screen.getByRole("dialog")).toBeTruthy()
  })
})
