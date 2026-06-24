import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { Event } from "~/definitions/database"
import type { CalendarDraftPreview } from "./calendarDraftPreview"
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
  year = 2026,
  month = 3,
  startingDay = 2,
  daysInMonth = 30,
  route = "/events?view=calendar&date=2026-04",
  onDayCellClick,
  draftPreview,
  onEventEdit,
  onEventDelete,
}: {
  events?: Event[]
  year?: number
  month?: number
  startingDay?: number
  daysInMonth?: number
  route?: string
  onDayCellClick?: (date: Date) => void
  draftPreview?: CalendarDraftPreview | null
  onEventEdit?: (event: Event) => void
  onEventDelete?: (eventId: string) => void
} = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <CalendarGrid
        events={events}
        year={year}
        month={month}
        startingDay={startingDay}
        daysInMonth={daysInMonth}
        onDayCellClick={onDayCellClick}
        draftPreview={draftPreview}
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

    expect(screen.getByRole("button", { name: "Event 10-4" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Event 10-5" })).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Event 10-4" }))

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
    fireEvent.contextMenu(screen.getByRole("button", { name: "Event 10-4" }))
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
})
