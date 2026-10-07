import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { PrimaryClient } from "~/definitions/contacts"
import type { Event, EventStatus } from "~/definitions/database"
import type { CalendarDraftPreview } from "~/features/calendar/lib/calendarDraftPreview"
import CalendarGrid from "./CalendarGrid"

const navigateMock = vi.fn()

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router")
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

function makeEvent(day: number, index: number, overrides: Partial<Event> = {}): Event {
  return {
    id: `event-${day}-${index}`,
    title: `Event ${day}-${index}`,
    type: "function",
    status: "new_lead",
    startDateTime: `2026-04-${String(day).padStart(2, "0")}T12:00:00.000Z`,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: null,
    calendarId: `calendar-${day}-${index}`,
    ...overrides,
  } as Event
}

function renderGrid({
  events = [],
  clientsByEventId,
  year = 2026,
  month = 3,
  startingDay = 2,
  daysInMonth = 30,
  route = "/events?view=calendar&date=2026-04",
  onDayCellClick,
  draftPreview,
  onEventEdit,
  onEventDelete,
  onEventStatusChange,
}: {
  events?: Event[]
  clientsByEventId?: Record<string, PrimaryClient>
  year?: number
  month?: number
  startingDay?: number
  daysInMonth?: number
  route?: string
  onDayCellClick?: (date: Date) => void
  draftPreview?: CalendarDraftPreview | null
  onEventEdit?: (event: Event) => void
  onEventDelete?: (eventId: string) => void
  onEventStatusChange?: (eventId: string, status: EventStatus) => void
} = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <CalendarGrid
        events={events}
        clientsByEventId={clientsByEventId}
        year={year}
        month={month}
        startingDay={startingDay}
        daysInMonth={daysInMonth}
        onDayCellClick={onDayCellClick}
        draftPreview={draftPreview}
        onEventEdit={onEventEdit}
        onEventDelete={onEventDelete}
        onEventStatusChange={onEventStatusChange}
      />
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

/** jsdom has no layout; give every element this client size so the grid can measure itself. */
function mockGridSize(width: number, height: number) {
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(width)
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(height)
}

// Day columns 150px wide: below the 160px narrow threshold.
const NARROW_GRID_WIDTH = (150 + 17) * 7
// Day columns ~268px wide, and 5 rows with 200px for events: one full card fits, three don't.
const WIDE_GRID_WIDTH = 2000
const ONE_CARD_GRID_HEIGHT = (200 + 32) * 5

describe("CalendarGrid row stability and event rendering", () => {
  it("uses 5 equal rows for months that span 5 calendar weeks", () => {
    renderGrid({ startingDay: 2, daysInMonth: 30 })

    const grid = screen.getByTestId("calendar-grid")
    expect(grid.getAttribute("style")).toContain("repeat(5, minmax(0, 1fr))")
  })

  it("uses 6 equal rows for months that span 6 calendar weeks", () => {
    renderGrid({ startingDay: 6, daysInMonth: 31 })

    const grid = screen.getByTestId("calendar-grid")
    expect(grid.getAttribute("style")).toContain("repeat(6, minmax(0, 1fr))")
  })

  it("renders outside-day cells so total grid cells equal weekRows x 7", () => {
    const { container } = renderGrid({ startingDay: 2, daysInMonth: 30 })

    expect(screen.getAllByTestId("calendar-grid-cell")).toHaveLength(35)
    expect(container.querySelectorAll('[data-cell-kind="day"]')).toHaveLength(30)
    expect(container.querySelectorAll('[data-cell-kind^="outside-"]')).toHaveLength(5)
  })

  it("renders correct leading and trailing outside day numbers", () => {
    const { container } = renderGrid({
      year: 2026,
      month: 3,
      startingDay: 2,
      daysInMonth: 30,
    })

    const leadingOutsideDays = Array.from(
      container.querySelectorAll('[data-cell-kind="outside-prev"][data-outside-day]'),
    ).map((node) => Number(node.getAttribute("data-outside-day")))
    const trailingOutsideDays = Array.from(
      container.querySelectorAll('[data-cell-kind="outside-next"][data-outside-day]'),
    ).map((node) => Number(node.getAttribute("data-outside-day")))

    expect(leadingOutsideDays).toEqual([30, 31])
    expect(trailingOutsideDays).toEqual([1, 2, 3])
  })

  it("shows first three day events and a +N more overflow trigger", () => {
    const events = Array.from({ length: 5 }, (_, i) => makeEvent(10, i + 1))
    renderGrid({ events })

    for (let i = 1; i <= 3; i += 1) {
      expect(screen.getByTitle(`Event 10-${i}`)).toBeTruthy()
    }
    expect(screen.queryByTitle("Event 10-4")).toBeNull()
    expect(screen.queryByTitle("Event 10-5")).toBeNull()

    const eventsContainer = screen.getByTestId("calendar-day-events-10")
    expect(eventsContainer.className).not.toContain("overflow-y-auto")
    expect(screen.getByRole("button", { name: "+2 more events" })).toBeTruthy()
  })

  it("opens overflow popover and allows navigating hidden day events without day-cell click", () => {
    const events = Array.from({ length: 5 }, (_, i) => makeEvent(10, i + 1))
    const onDayCellClick = vi.fn()
    renderGrid({ events, onDayCellClick })

    fireEvent.click(screen.getByRole("button", { name: "+2 more events" }))
    expect(onDayCellClick).not.toHaveBeenCalled()

    expect(screen.getByRole("button", { name: /Event 10-4/ })).toBeTruthy()
    expect(screen.getByRole("button", { name: /Event 10-5/ })).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: /Event 10-4/ }))

    expect(navigateMock).toHaveBeenCalledWith(
      "/events/event-10-4?returnTo=%2Fevents%3Fview%3Dcalendar%26date%3D2026-04",
    )
    expect(onDayCellClick).not.toHaveBeenCalled()
  })

  it("navigates to event detail with returnTo state when an event is clicked", () => {
    const onDayCellClick = vi.fn()
    renderGrid({ events: [makeEvent(10, 1)], onDayCellClick })

    fireEvent.click(screen.getByTitle("Event 10-1"))

    expect(navigateMock).toHaveBeenCalledWith(
      "/events/event-10-1?returnTo=%2Fevents%3Fview%3Dcalendar%26date%3D2026-04",
    )
    expect(onDayCellClick).not.toHaveBeenCalled()
  })

  it("opens context menu on visible chip right-click and runs edit/delete callbacks", () => {
    const onDayCellClick = vi.fn()
    const onEventEdit = vi.fn()
    const onEventDelete = vi.fn()
    const event = makeEvent(10, 1)
    renderGrid({
      events: [event],
      onDayCellClick,
      onEventEdit,
      onEventDelete,
    })

    fireEvent.contextMenu(screen.getByTitle("Event 10-1"))

    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }))
    expect(onEventEdit).toHaveBeenCalledWith(event)
    expect(navigateMock).not.toHaveBeenCalled()
    expect(onDayCellClick).not.toHaveBeenCalled()

    fireEvent.contextMenu(screen.getByTitle("Event 10-1"))
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }))
    expect(onEventDelete).toHaveBeenCalledWith(event.id)
    expect(navigateMock).not.toHaveBeenCalled()
    expect(onDayCellClick).not.toHaveBeenCalled()
  })

  it("opens context menu for overflow items on right-click and does not navigate", () => {
    const events = Array.from({ length: 5 }, (_, i) => makeEvent(10, i + 1))
    const onDayCellClick = vi.fn()
    const onEventEdit = vi.fn()
    renderGrid({ events, onDayCellClick, onEventEdit })

    fireEvent.click(screen.getByRole("button", { name: "+2 more events" }))
    fireEvent.contextMenu(screen.getByRole("button", { name: /Event 10-4/ }))
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }))

    expect(onEventEdit).toHaveBeenCalledWith(events[3])
    expect(navigateMock).not.toHaveBeenCalled()
    expect(onDayCellClick).not.toHaveBeenCalled()
  })

  it("calls onDayCellClick with the selected local date when day cell is clicked", () => {
    const onDayCellClick = vi.fn()
    renderGrid({ onDayCellClick })

    fireEvent.click(document.querySelector('[data-cell-kind="day"][data-day-of-month="10"]') as Element)

    expect(onDayCellClick).toHaveBeenCalledTimes(1)
    const clickedDate = onDayCellClick.mock.calls[0][0] as Date
    expect(clickedDate).toBeInstanceOf(Date)
    expect(clickedDate.getFullYear()).toBe(2026)
    expect(clickedDate.getMonth()).toBe(3)
    expect(clickedDate.getDate()).toBe(10)
  })

  it("keeps outside day cells non-interactive with no event buttons", () => {
    const onDayCellClick = vi.fn()
    const { container } = renderGrid({
      events: [makeEvent(10, 1)],
      startingDay: 2,
      daysInMonth: 30,
      onDayCellClick,
    })

    const outsideCell = container.querySelector('[data-cell-kind="outside-prev"]')
    expect(outsideCell).toBeTruthy()

    if (outsideCell) {
      fireEvent.click(outsideCell)
    }

    expect(navigateMock).not.toHaveBeenCalled()
    expect(onDayCellClick).not.toHaveBeenCalled()
    expect(container.querySelector('[data-cell-kind^="outside-"] button')).toBeNull()
  })

  it("renders draft chip on matching day", () => {
    renderGrid({
      draftPreview: {
        title: "Draft Event",
        startDateTime: "2026-04-10T12:00:00.000Z",
      },
    })

    expect(screen.getByTestId("calendar-draft-chip-10")).toBeTruthy()
    expect(screen.getByText("Draft Event")).toBeTruthy()
  })

  it("renders Untitled when draft title is empty", () => {
    renderGrid({
      draftPreview: {
        title: "",
        startDateTime: "2026-04-10T12:00:00.000Z",
      },
    })

    expect(screen.getByTestId("calendar-draft-chip-10")).toBeTruthy()
    expect(screen.getByText("Untitled")).toBeTruthy()
  })

  it("does not render draft chip when preview date is outside displayed month", () => {
    renderGrid({
      draftPreview: {
        title: "Draft Event",
        startDateTime: "2026-05-10T12:00:00.000Z",
      },
    })

    expect(screen.queryByText("Draft Event")).toBeNull()
  })

  it("does not navigate or trigger day click when draft chip is clicked", () => {
    const onDayCellClick = vi.fn()
    renderGrid({
      onDayCellClick,
      draftPreview: {
        title: "Draft Event",
        startDateTime: "2026-04-10T12:00:00.000Z",
      },
    })

    fireEvent.click(screen.getByTestId("calendar-draft-chip-10"))

    expect(navigateMock).not.toHaveBeenCalled()
    expect(onDayCellClick).not.toHaveBeenCalled()
  })

  it("keeps today highlighting behavior", () => {
    const today = new Date()
    const daysInMonth = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0,
    ).getDate()

    renderGrid({
      year: today.getFullYear(),
      month: today.getMonth(),
      startingDay: 0,
      daysInMonth,
    })

    const todayCell = document.querySelector(
      `[data-cell-kind="day"][data-day-of-month="${today.getDate()}"] [data-day-number]`,
    )

    expect(todayCell).toBeTruthy()
    expect(todayCell?.className).toContain("bg-orange-500")
  })

  it("shows warning icon on visible chips when calendarId is missing", () => {
    renderGrid({ events: [makeEvent(10, 1, { calendarId: null })] })

    expect(screen.getByTitle("Not uploaded to Google Calendar.")).toBeTruthy()
  })

  it("shows warning icon when calendarId is blank after trim", () => {
    renderGrid({ events: [makeEvent(10, 1, { calendarId: "   " })] })

    expect(screen.getByTitle("Not uploaded to Google Calendar.")).toBeTruthy()
  })

  it("hides warning icon when calendarId exists", () => {
    renderGrid({ events: [makeEvent(10, 1, { calendarId: "gcal-123" })] })

    expect(screen.queryByTitle("Not uploaded to Google Calendar.")).toBeNull()
  })

  it("renders warning icon in overflow popover items when calendarId is missing", () => {
    const events = Array.from({ length: 5 }, (_, i) => makeEvent(10, i + 1, { calendarId: null }))
    renderGrid({ events })

    fireEvent.click(screen.getByRole("button", { name: "+2 more events" }))

    expect(screen.getAllByTitle("Not uploaded to Google Calendar.").length).toBeGreaterThan(0)
  })

  it("renders the status band, guest count and client, and names the card in reading order", () => {
    renderGrid({
      events: [makeEvent(10, 1, { status: "confirmed", minGuests: 120, maxGuests: 150, guestCountFinal: 0 })],
      clientsByEventId: {
        "event-10-1": { contactId: "c1", displayName: "Maya Henderson", email: null, phone: null },
      },
    })

    const card = screen.getByRole("button", {
      name: "Confirmed: Event 10-1, Maya Henderson, 120 to 150 guests",
    })
    expect(card.textContent).toContain("Confirmed")
    expect(card.textContent).toContain("120–150")
    expect(card.textContent).not.toContain("guests")
    expect(screen.getByTitle("Maya Henderson")).toBeTruthy()
  })

  it("hides the guest count when it is unknown", () => {
    renderGrid({ events: [makeEvent(10, 1, { minGuests: null, maxGuests: null })] })

    const band = screen.getByTestId("calendar-event-card-band")
    expect(band.textContent).toBe("New Lead")
  })

  it("does not use event type colours on cards", () => {
    renderGrid({ events: [makeEvent(10, 1, { type: "wedding" })] })

    expect(screen.getByTitle("Event 10-1").className).not.toContain("purple")
  })
})

describe("CalendarGrid compact lines", () => {
  it("shows full cards until the grid has been measured", () => {
    renderGrid({ events: [makeEvent(10, 1)] })

    expect(screen.queryByTestId("calendar-compact-line")).toBeNull()
    expect(screen.getByTestId("calendar-event-card-band")).toBeTruthy()
  })

  it("collapses every day to compact lines when columns are narrow", () => {
    mockGridSize(NARROW_GRID_WIDTH, 5000)
    renderGrid({
      events: [
        makeEvent(1, 1),
        makeEvent(10, 1, { status: "confirmed", minGuests: 120, maxGuests: 150, guestCountFinal: 0 }),
      ],
    })

    expect(screen.getAllByTestId("calendar-compact-line")).toHaveLength(2)
    expect(screen.queryByTestId("calendar-event-card-band")).toBeNull()

    const line = screen.getByRole("button", { name: "Confirmed: Event 10-1, 120 to 150 guests" })
    expect(line.getAttribute("title")).toBe("Confirmed: Event 10-1")
    expect(line.textContent).toBe("Event 10-1120–150")
    expect(line.querySelector('[data-glyph="dot"]')?.getAttribute("aria-hidden")).toBe("true")
  })

  it("collapses only the week row whose day doesn't fit full cards", () => {
    mockGridSize(WIDE_GRID_WIDTH, ONE_CARD_GRID_HEIGHT)
    // April 2026 starts on Wednesday: the 10th is in row 2, the 20th in row 4.
    renderGrid({
      events: [makeEvent(10, 1), makeEvent(10, 2), makeEvent(10, 3), makeEvent(20, 1)],
    })

    const busyRow = screen.getByTestId("calendar-day-events-10")
    const quietRow = screen.getByTestId("calendar-day-events-20")
    const sameRowDay = screen.getByTestId("calendar-day-events-11")
    expect(within(busyRow).getAllByTestId("calendar-compact-line")).toHaveLength(3)
    expect(sameRowDay.querySelector('[data-density="compact"]')).toBeTruthy()
    expect(within(quietRow).queryByTestId("calendar-compact-line")).toBeNull()
    expect(within(quietRow).getByTestId("calendar-event-card-band")).toBeTruthy()
  })

  it("sorts compact lines by status and keeps start-time order within a status", () => {
    mockGridSize(NARROW_GRID_WIDTH, 5000)
    renderGrid({
      events: [
        makeEvent(10, 1, { status: "closed", startDateTime: "2026-04-10T09:00:00.000Z" }),
        makeEvent(10, 2, { status: "confirmed", startDateTime: "2026-04-10T10:00:00.000Z" }),
        makeEvent(10, 3, { status: "new_lead", startDateTime: "2026-04-10T11:00:00.000Z" }),
        makeEvent(10, 4, { status: "confirmed", startDateTime: "2026-04-10T08:00:00.000Z" }),
      ],
    })

    const titles = within(screen.getByTestId("calendar-day-events-10"))
      .getAllByTestId("calendar-compact-line")
      .slice(0, 3)
      .map((line) => line.getAttribute("title"))
    expect(titles).toEqual(["New Lead: Event 10-3", "Confirmed: Event 10-4", "Confirmed: Event 10-2"])
    expect(screen.getByRole("button", { name: "+1 more events" })).toBeTruthy()
  })

  it("opens a details popover from a line without opening the day, and navigates from it", () => {
    mockGridSize(NARROW_GRID_WIDTH, 5000)
    const onDayCellClick = vi.fn()
    renderGrid({
      events: [makeEvent(10, 1, { minGuests: 120, maxGuests: 150, guestCountFinal: 0 })],
      clientsByEventId: {
        "event-10-1": { contactId: "c1", displayName: "Maya Henderson", email: null, phone: null },
      },
      onDayCellClick,
    })

    const line = screen.getByTestId("calendar-compact-line")
    fireEvent.click(line)

    const dialog = screen.getByRole("dialog", { name: "Event 10-1" })
    expect(line.getAttribute("data-state")).toBe("open")
    expect(dialog.textContent).toContain("New Lead")
    expect(dialog.textContent).toContain("Friday, April 10")
    expect(dialog.textContent).toContain("Maya Henderson")
    expect(dialog.textContent).toContain("120 to 150 guests")
    expect(onDayCellClick).not.toHaveBeenCalled()

    fireEvent.click(within(dialog).getByRole("button", { name: "Open event" }))
    expect(navigateMock).toHaveBeenCalledWith(
      "/events/event-10-1?returnTo=%2Fevents%3Fview%3Dcalendar%26date%3D2026-04",
    )
    expect(onDayCellClick).not.toHaveBeenCalled()
  })

  it("closes the popover with the close button", () => {
    mockGridSize(NARROW_GRID_WIDTH, 5000)
    renderGrid({ events: [makeEvent(10, 1)] })

    fireEvent.click(screen.getByTestId("calendar-compact-line"))
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Close" }))

    expect(screen.queryByRole("dialog")).toBeNull()
    expect(screen.getByTestId("calendar-compact-line").getAttribute("data-state")).toBe("closed")
  })

  it("only offers Change status when a handler is wired", () => {
    mockGridSize(NARROW_GRID_WIDTH, 5000)
    renderGrid({ events: [makeEvent(10, 1)] })

    fireEvent.click(screen.getByTestId("calendar-compact-line"))

    expect(within(screen.getByRole("dialog")).queryByRole("button", { name: "Change status" })).toBeNull()
  })

  it("changes status from the popover", () => {
    mockGridSize(NARROW_GRID_WIDTH, 5000)
    const onEventStatusChange = vi.fn()
    const onDayCellClick = vi.fn()
    renderGrid({ events: [makeEvent(10, 1)], onEventStatusChange, onDayCellClick })

    fireEvent.click(screen.getByTestId("calendar-compact-line"))
    fireEvent.keyDown(within(screen.getByRole("dialog")).getByRole("button", { name: "Change status" }), {
      key: "Enter",
    })
    fireEvent.click(screen.getByRole("menuitem", { name: "Confirmed" }))

    expect(onEventStatusChange).toHaveBeenCalledWith("event-10-1", "confirmed")
    expect(onDayCellClick).not.toHaveBeenCalled()
  })

  it("keeps the right-click menu on compact lines", () => {
    mockGridSize(NARROW_GRID_WIDTH, 5000)
    const onEventEdit = vi.fn()
    const event = makeEvent(10, 1)
    renderGrid({ events: [event], onEventEdit })

    fireEvent.contextMenu(screen.getByTestId("calendar-compact-line"))
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }))

    expect(onEventEdit).toHaveBeenCalledWith(event)
  })
})
