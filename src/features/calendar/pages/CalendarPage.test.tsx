import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Event } from "~/definitions/database"
import CalendarPage from "./CalendarPage"
import { ACTIONS } from "../state/calendarSidePanelReducer"

const dispatchMock = vi.fn()

vi.mock("../state/useCalendarPanelState", () => ({
  useCalendarPanelState: () => ({
    dispatch: dispatchMock,
    ui: {
      sidebarMode: "default",
      createDraftPreview: null,
    },
  }),
}))

vi.mock("../views/EventsCalendar", () => ({
  default: ({
    onDayCellClick,
    onEventEdit,
    onEventDelete,
  }: {
    onDayCellClick?: (date: Date) => void
    onEventEdit?: (event: Event) => void
    onEventDelete?: (eventId: string) => void
  }) => (
    <div data-testid="events-calendar">
      <button
        type="button"
        onClick={() => onDayCellClick?.(new Date(2026, 6, 14))}
      >
        Day click
      </button>
      <button
        type="button"
        onClick={() =>
          onEventEdit?.({
            id: "evt_1",
            title: "Event 1",
            type: "function",
            status: "new_lead",
            startDateTime: null,
            endDateTime: null,
            clientName: "",
            clientEmail: "",
            clientPhone: "",
            minGuests: 0,
            maxGuests: 0,
            createdAt: "created",
            updatedAt: null,
          } as Event)
        }
      >
        Edit click
      </button>
      <button type="button" onClick={() => onEventDelete?.("evt_1")}>
        Delete click
      </button>
    </div>
  ),
}))

function createQueryState() {
  return {
    state: {
      date: "2026-07",
      search: null,
      view: "calendar",
      type: null,
      status: null,
    },
    searchInput: "",
    setView: vi.fn(),
    setDate: vi.fn(),
    setSearch: vi.fn(),
    setSearchInput: vi.fn(),
    resetSearchAndFilters: vi.fn(),
    setType: vi.fn(),
    setStatus: vi.fn(),
    reset: vi.fn(),
  }
}

function createEventsHook() {
  return {
    monthEvents: [],
  }
}

describe("CalendarPage", () => {
  beforeEach(() => {
    dispatchMock.mockReset()
  })
  afterEach(() => {
    cleanup()
  })

  it("dispatches OPEN_CREATE from calendar day click", () => {
    render(
      <CalendarPage
        queryState={createQueryState() as never}
        eventsHook={createEventsHook() as never}
        onDeleteRequest={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Day click" }))

    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ACTIONS.OPEN_CREATE,
        prefillIso: expect.any(String),
      }),
    )
  })

  it("dispatches OPEN_EDIT from calendar event edit callback", () => {
    render(
      <CalendarPage
        queryState={createQueryState() as never}
        eventsHook={createEventsHook() as never}
        onDeleteRequest={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Edit click" }))

    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: ACTIONS.OPEN_EDIT }),
    )
  })

  it("passes delete requests through to orchestrator callback", () => {
    const onDeleteRequest = vi.fn()

    render(
      <CalendarPage
        queryState={createQueryState() as never}
        eventsHook={createEventsHook() as never}
        onDeleteRequest={onDeleteRequest}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Delete click" }))
    expect(onDeleteRequest).toHaveBeenCalledWith("evt_1")
  })
})
