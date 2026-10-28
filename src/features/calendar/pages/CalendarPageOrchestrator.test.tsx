import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Event, EventRequest } from "~/definitions/database"
import CalendarPageOrchastrator from "./CalendarPageOrchestrator"

const monthNavigatorPropsMock = vi.fn()
const eventsTablePropsMock = vi.fn()
const calendarPagePropsMock = vi.fn()
const dispatchMock = vi.fn()
let bodyMode = "calendar"
let ui: { selectedRequestId: string | null; sidebarMode: string; reviewingRequest: EventRequest | null } = {
  selectedRequestId: null, sidebarMode: "default", reviewingRequest: null,
}

vi.mock("~/features/calendar/navigation/MonthNavigator", () => ({
  default: ({
    onMonthChange,
    onGoToToday,
  }: {
    onMonthChange: (month: string) => void
    onGoToToday: () => void
  }) => {
    monthNavigatorPropsMock({ onMonthChange, onGoToToday })
    return (
      <div data-testid="month-nav">
        <button type="button" onClick={() => onMonthChange("2026-08")}>
          Prev month
        </button>
        <button type="button" onClick={onGoToToday}>
          Today
        </button>
      </div>
    )
  },
}))

vi.mock("./CalendarPage", () => ({
  default: ({
    onDeleteRequest,
  }: {
    onDeleteRequest: (eventId: string) => void
  }) => {
    calendarPagePropsMock({ onDeleteRequest })
    return <div data-testid="calendar-month-view">calendar-month-view</div>
  },
}))

const dismissRequestMock = vi.fn()
const holidayRetryMock = vi.fn()
let holidayNotice: { message: string; canRetry: boolean } | null = null
vi.mock("../hooks/useMonthHolidays", () => ({
  useMonthHolidays: () => ({ holidays: [], notice: holidayNotice, retry: holidayRetryMock, isRetrying: false }),
}))
let pendingRequests: EventRequest[] = []
vi.mock("~/features/event-requests/hooks/useEventRequests", () => ({
  useEventRequests: () => ({ requests: pendingRequests, dismissRequest: dismissRequestMock }),
}))

vi.mock("~/features/event-requests/components/RequestMiniCalendar", () => ({
  default: () => <div data-testid="request-mini-calendar" />,
}))

vi.mock("~/hooks/useEventContacts", () => ({
  usePrimaryClients: () => ({ data: {} }),
}))

vi.mock("~/features/calendar/views/EventsTable", () => ({
  default: ({
    onEdit,
    onDelete,
  }: {
    onEdit: (event: Event) => void
    onDelete: (eventId: string) => void
  }) => {
    eventsTablePropsMock({ onEdit, onDelete })
    return (
      <div data-testid="events-table-view">
        <button
          type="button"
          onClick={() =>
            onEdit({
              id: "evt_1",
              title: "Event",
              type: "function",
              status: "new_lead",
              startDateTime: null,
              endDateTime: null,
              minGuests: 0,
              maxGuests: 0,
              createdAt: "created",
              updatedAt: null,
            } as Event)
          }
        >
          Edit row
        </button>
        <button type="button" onClick={() => onDelete("evt_1")}>
          Delete row
        </button>
      </div>
    )
  },
}))

vi.mock("../state/useCalendarPanelState", () => ({
  useCalendarPanelState: () => ({
    dispatch: dispatchMock,
    ui: { bodyMode, ...ui },
  }),
}))

vi.mock("~/lib/months", async () => {
  const actual = await vi.importActual<typeof import("~/lib/months")>("~/lib/months")
  return {
    ...actual,
    getCurrentMonthParam: () => "2030-01",
  }
})

function createQueryState(search: string | null = null) {
  const setDate = vi.fn()
  return {
    queryState: {
      state: {
        date: "2026-07",
        search,
        view: "calendar",
        type: null,
        status: null,
      },
      searchInput: "",
      setView: vi.fn(),
      setDate,
      setSearch: vi.fn(),
      setSearchInput: vi.fn(),
      resetSearchAndFilters: vi.fn(),
      setType: vi.fn(),
      setStatus: vi.fn(),
      reset: vi.fn(),
    },
    setDate,
  }
}

function createEventsHook() {
  return {
    isLoading: false,
  }
}

function createSearchController(enabled = false, overrides: { invalidDateRange?: boolean; isError?: boolean } = {}) {
  return {
    searchQuery: {
      result: { items: [], total: 0 },
      isFetching: false,
      enabled,
      invalidDateRange: false,
      isError: false,
      refetch: vi.fn(),
      ...overrides,
    },
    pagination: {
      canPrev: false,
      canNext: false,
      goPrev: vi.fn(),
      goNext: vi.fn(),
      page: 0,
    },
  }
}

describe("CalendarPageOrchestrator", () => {
  beforeEach(() => {
    dispatchMock.mockReset()
    monthNavigatorPropsMock.mockReset()
    eventsTablePropsMock.mockReset()
    calendarPagePropsMock.mockReset()
    dismissRequestMock.mockReset()
    bodyMode = "calendar"
    ui = { selectedRequestId: null, sidebarMode: "default", reviewingRequest: null }
    pendingRequests = []
    holidayNotice = null
    holidayRetryMock.mockReset()
  })
  afterEach(() => {
    cleanup()
  })

  it("renders month calendar content when search is empty", () => {
    const { queryState } = createQueryState(null)
    const onDeleteRequest = vi.fn()

    render(
      <CalendarPageOrchastrator
        queryState={queryState as never}
        eventsHook={createEventsHook() as never}
        searchController={createSearchController() as never}
        onDeleteRequest={onDeleteRequest}
      />,
    )

    expect(screen.getByTestId("month-nav")).toBeTruthy()
    expect(screen.getByTestId("calendar-month-view")).toBeTruthy()
    expect(screen.queryByTestId("events-table-view")).toBeNull()
    expect(screen.queryByTestId("calendar-holiday-notice")).toBeNull()
  })

  it("notes unavailable holidays beside the month controls without blocking the calendar", () => {
    holidayNotice = { message: "Holidays couldn't be loaded.", canRetry: true }
    render(
      <CalendarPageOrchastrator
        queryState={createQueryState(null).queryState as never}
        eventsHook={createEventsHook() as never}
        searchController={createSearchController() as never}
        onDeleteRequest={vi.fn()}
      />,
    )

    expect(screen.getByTestId("calendar-holiday-notice").textContent).toContain("Holidays couldn't be loaded.")
    expect(screen.getByTestId("calendar-month-view")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Retry" }))
    expect(holidayRetryMock).toHaveBeenCalledTimes(1)
  })

  it("shows filter-only results and returns to the calendar when filters are cleared", () => {
    const props = {
      queryState: createQueryState(null).queryState as never,
      eventsHook: createEventsHook() as never,
      onDeleteRequest: vi.fn(),
    }
    const { rerender } = render(
      <CalendarPageOrchastrator {...props} searchController={createSearchController(true) as never} />,
    )
    expect(screen.getByTestId("events-table-view")).toBeTruthy()
    expect(screen.getByText("0 results")).toBeTruthy()
    expect(screen.queryByTestId("calendar-month-view")).toBeNull()

    rerender(<CalendarPageOrchastrator {...props} searchController={createSearchController() as never} />)
    expect(screen.getByTestId("calendar-month-view")).toBeTruthy()
    expect(screen.queryByTestId("events-table-view")).toBeNull()
  })

  it.each([
    [{ invalidDateRange: true }, /"From" date must be on or before/],
    [{ isError: true }, /Could not search events/],
  ])("shows why a search has no results instead of \"0 results\": %o", (overrides, message) => {
    render(
      <CalendarPageOrchastrator
        queryState={createQueryState(null).queryState as never}
        eventsHook={createEventsHook() as never}
        searchController={createSearchController(true, overrides) as never}
        onDeleteRequest={vi.fn()}
      />,
    )
    expect(screen.getByRole("alert").textContent).toMatch(message)
    expect(screen.queryByText("0 results")).toBeNull()
    expect(screen.queryByTestId("events-table-view")).toBeNull()
  })

  it("uses search table when search query is active", () => {
    const { queryState } = createQueryState("wedding")

    render(
      <CalendarPageOrchastrator
        queryState={queryState as never}
        eventsHook={createEventsHook() as never}
        searchController={createSearchController() as never}
        onDeleteRequest={vi.fn()}
      />,
    )

    expect(screen.getByTestId("events-table-view")).toBeTruthy()
    expect(screen.queryByTestId("calendar-month-view")).toBeNull()
  })

  it("wires month changes and today shortcut to query state", () => {
    const { queryState, setDate } = createQueryState(null)

    render(
      <CalendarPageOrchastrator
        queryState={queryState as never}
        eventsHook={createEventsHook() as never}
        searchController={createSearchController() as never}
        onDeleteRequest={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Prev month" }))
    fireEvent.click(screen.getByRole("button", { name: "Today" }))

    expect(setDate).toHaveBeenCalledWith("2026-08")
    expect(setDate).toHaveBeenCalledWith("2030-01")
  })

  it("dispatches OPEN_EDIT when table edit callback is used", () => {
    const { queryState } = createQueryState("party")

    render(
      <CalendarPageOrchastrator
        queryState={queryState as never}
        eventsHook={createEventsHook() as never}
        searchController={createSearchController() as never}
        onDeleteRequest={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Edit row" }))
    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: "OPEN_EDIT" }),
    )
  })

  describe("Inbox", () => {
    const request = {
      id: "req-1", submittedAt: "2026-10-16T15:00:00.000Z", eventName: "Jane & Sam's wedding", firstName: "Jane", lastName: "Smith",
      organizationName: null, email: "jane@example.test", phone: "555-0100", eventType: "wedding", preferredDate: "2027-06-20",
      alternateDate: null, startTime: null, guestCount: 120, details: "Outdoor ceremony", referralSource: null, extraAnswers: [],
    } as unknown as EventRequest

    function renderInbox(searchEnabled = false) {
      bodyMode = "inbox"
      pendingRequests = [request]
      render(
        <CalendarPageOrchastrator
          queryState={createQueryState(null).queryState as never}
          eventsHook={createEventsHook() as never}
          searchController={createSearchController(searchEnabled) as never}
          onDeleteRequest={vi.fn()}
        />,
      )
    }

    it("asks for a selection, and goes back to the calendar", () => {
      renderInbox()
      expect(screen.getByText("Select a request to see what the client sent.")).toBeTruthy()
      expect(screen.queryByRole("button", { name: "Review" })).toBeNull()
      expect(screen.queryByTestId("month-nav")).toBeNull()

      fireEvent.click(screen.getByRole("button", { name: "Back to Calendar" }))
      expect(dispatchMock).toHaveBeenCalledWith({ type: "OPEN_CALENDAR_VIEW" })
    })

    it("shows the selected request, and reviews or dismisses it from the header", () => {
      ui = { selectedRequestId: "req-1", sidebarMode: "default", reviewingRequest: null }
      renderInbox()
      expect(screen.getByRole("heading", { name: "Jane & Sam's wedding" })).toBeTruthy()
      expect(screen.getByText("Outdoor ceremony")).toBeTruthy()

      fireEvent.click(screen.getByRole("button", { name: "Review" }))
      expect(dispatchMock).toHaveBeenCalledWith({ type: "OPEN_REVIEW_REQUEST", request })

      fireEvent.click(screen.getByRole("button", { name: "Dismiss" }))
      expect(dispatchMock).toHaveBeenCalledWith({ type: "SELECT_REQUEST", requestId: null })
      expect(dispatchMock).not.toHaveBeenCalledWith({ type: "OPEN_DEFAULT" })
      expect(dismissRequestMock).toHaveBeenCalledWith("req-1")
    })

    it("closes the review form when the request under review is dismissed", () => {
      ui = { selectedRequestId: "req-1", sidebarMode: "create", reviewingRequest: request }
      renderInbox()
      expect(screen.queryByRole("button", { name: "Review" })).toBeNull()
      expect(screen.getByText("Reviewing")).toBeTruthy()

      fireEvent.click(screen.getByRole("button", { name: "Dismiss" }))
      expect(dispatchMock).toHaveBeenCalledWith({ type: "OPEN_DEFAULT" })
      expect(dismissRequestMock).toHaveBeenCalledWith("req-1")
    })

    it("shows the Inbox over filters left in the URL, but shows results while searching", () => {
      renderInbox(true)
      expect(screen.getByText("Select a request to see what the client sent.")).toBeTruthy()
      expect(screen.queryByTestId("events-table-view")).toBeNull()
      cleanup()

      ui = { selectedRequestId: null, sidebarMode: "search", reviewingRequest: null }
      renderInbox(true)
      expect(screen.getByTestId("events-table-view")).toBeTruthy()
    })
  })
})
