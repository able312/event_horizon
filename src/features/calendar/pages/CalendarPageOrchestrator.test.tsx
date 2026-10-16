import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Event, EventRequest } from "~/definitions/database"
import CalendarPageOrchastrator from "./CalendarPageOrchestrator"

const monthNavigatorPropsMock = vi.fn()
const eventsTablePropsMock = vi.fn()
const calendarPagePropsMock = vi.fn()
const dispatchMock = vi.fn()
const leadsRefetchMock = vi.fn()
let bodyMode = "calendar"
let leadsQuery: { isLoading: boolean; isError?: boolean; isFetching?: boolean; refetch?: () => Promise<unknown> } = { isLoading: false }

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

vi.mock("~/hooks/useNewLeads", () => ({
  useNewLeads: () => ({ leadsQuery, leads: [] }),
}))

const dismissRequestMock = vi.fn()
let pendingRequests: EventRequest[] = []
let requestsQuery = { isLoading: false, isError: false, isFetching: false, refetch: vi.fn() }
vi.mock("~/hooks/useEventRequests", () => ({
  useEventRequests: () => ({ requestsQuery, requests: pendingRequests, dismissRequest: dismissRequestMock }),
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
    ui: { bodyMode },
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

function createSearchController() {
  return {
    searchQuery: {
      result: { items: [], total: 0 },
      isFetching: false,
      enabled: true,
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
    leadsRefetchMock.mockReset()
    bodyMode = "calendar"
    leadsQuery = { isLoading: false }
    pendingRequests = []
    requestsQuery = { isLoading: false, isError: false, isFetching: false, refetch: vi.fn() }
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

  it("shows a retryable error instead of an empty leads list when the leads query fails", () => {
    bodyMode = "inbox"
    leadsQuery = { isLoading: false, isError: true, isFetching: false, refetch: leadsRefetchMock }
    const { queryState } = createQueryState(null)

    render(
      <CalendarPageOrchastrator
        queryState={queryState as never}
        eventsHook={createEventsHook() as never}
        searchController={createSearchController() as never}
        onDeleteRequest={vi.fn()}
      />,
    )

    expect(screen.getByRole("alert").textContent).toContain("Could not load new leads.")
    expect(screen.queryByTestId("events-table-view")).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Retry" }))
    expect(leadsRefetchMock).toHaveBeenCalled()
  })

  it("shows pending requests above the new leads, and reviews or dismisses them", () => {
    bodyMode = "inbox"
    const request = {
      id: "req-1", submittedAt: "2026-10-16T15:00:00.000Z", firstName: "Jane", lastName: "Smith", organizationName: null,
      email: "jane@example.test", phone: "555-0100", eventType: "wedding", preferredDate: "2027-06-20", startTime: null,
      guestCount: 120, details: "Outdoor ceremony",
    } as EventRequest
    pendingRequests = [request]
    const { queryState } = createQueryState(null)

    render(
      <CalendarPageOrchastrator
        queryState={queryState as never}
        eventsHook={createEventsHook() as never}
        searchController={createSearchController() as never}
        onDeleteRequest={vi.fn()}
      />,
    )

    expect(screen.getByRole("heading", { name: "Requests (1)" })).toBeTruthy()
    expect(screen.getByRole("heading", { name: "New leads" })).toBeTruthy()
    expect(screen.getByTestId("events-table-view")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Review request from Jane Smith" }))
    expect(dispatchMock).toHaveBeenCalledWith({ type: "OPEN_REVIEW_REQUEST", request })

    fireEvent.click(screen.getByRole("button", { name: "Dismiss request from Jane Smith" }))
    expect(dismissRequestMock).toHaveBeenCalledWith("req-1")
  })

  it("shows a retryable error instead of an empty requests list when the requests query fails", () => {
    bodyMode = "inbox"
    requestsQuery = { isLoading: false, isError: true, isFetching: false, refetch: vi.fn() }
    const { queryState } = createQueryState(null)

    render(
      <CalendarPageOrchastrator
        queryState={queryState as never}
        eventsHook={createEventsHook() as never}
        searchController={createSearchController() as never}
        onDeleteRequest={vi.fn()}
      />,
    )

    expect(screen.getByRole("alert").textContent).toContain("Could not load website requests.")
    fireEvent.click(screen.getByRole("button", { name: "Retry" }))
    expect(requestsQuery.refetch).toHaveBeenCalled()
  })
})
