import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useEffect } from "react"
import type { ReactNode } from "react"

import CalendarPanelOrchastrator from "./CalendarPanelOrchestrator"

const useCalendarPanelStateMock = vi.fn()
const useCalendarWorkspaceViewModelMock = vi.fn()
const createFormMountMock = vi.fn()
const createFormPropsMock = vi.fn()

vi.mock("~/components/layouts/SplitLayout", () => ({
  Panel: {
    Header: ({ children }: { children: ReactNode }) => <>{children}</>,
    Content: ({ children }: { children: ReactNode }) => <>{children}</>,
  },
}))

vi.mock("~/features/calendar/forms/CreateEventSidebarForm", () => ({
  default: function MockCreateEventSidebarForm(props: {
    initialStartDateTime?: string
    initialEndDateTime?: string
  }) {
    useEffect(() => {
      createFormMountMock()
    }, [])
    createFormPropsMock(props)
    return <div data-testid="create-event-form-mock" />
  },
}))

vi.mock("~/features/calendar/forms/EditEventSidebarForm", () => ({
  default: () => <div data-testid="edit-form-mock" />,
}))

vi.mock("./content/CalendarDefaultPanel", () => ({
  default: () => <div data-testid="default-panel-mock" />,
}))

vi.mock("./content/SearchPanel", () => ({
  default: () => <div data-testid="search-panel-mock" />,
}))

vi.mock("./headers/CalendarDefaultPanelHeader", () => ({
  default: () => <div data-testid="default-header-mock" />,
}))

vi.mock("./headers/ClosePanelHeader", () => ({
  default: () => <div data-testid="close-header-mock" />,
}))

vi.mock("../state/useCalendarPanelState", () => ({
  useCalendarPanelState: () => useCalendarPanelStateMock(),
}))

vi.mock("../hooks/useCalendarWorkspaceViewModel", () => ({
  useCalendarWorkspaceViewModel: () => useCalendarWorkspaceViewModelMock(),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("CalendarPanelOrchastrator create form remount behavior", () => {
  it("remounts create form when createFormVersion increments and applies latest prefill", () => {
    const dispatch = vi.fn()
    const queryState = {
      state: { date: "2026-05", type: null, status: null },
      searchInput: "",
      setDate: vi.fn(),
      setSearchInput: vi.fn(),
      setType: vi.fn(),
      setStatus: vi.fn(),
    } as never

    const eventsHook = {} as never
    const searchController = {
      filters: { dateFrom: "", dateTo: "", setDateFrom: vi.fn(), setDateTo: vi.fn() },
    } as never

    useCalendarWorkspaceViewModelMock.mockReturnValue({
      panelActions: {
        openSearchPanel: vi.fn(),
        openCreatePanel: vi.fn(),
        openDefaultPanel: vi.fn(),
        closeSearchPanel: vi.fn(),
        toggleUnscheduledView: vi.fn(),
      },
      mutations: {
        onCreateEvent: vi.fn(),
        onSaveEventUpdates: vi.fn(),
      },
    })

    useCalendarPanelStateMock.mockReturnValue({
      dispatch,
      ui: {
        sidebarMode: "create",
        bodyMode: "calendar",
        editingEvent: null,
        createDraftPreview: null,
        createPrefillIso: "2026-07-14T10:00:00.000Z",
        createFormVersion: 1,
        searchFocusVersion: 0,
      },
    })

    const { rerender } = render(
      <CalendarPanelOrchastrator
        queryState={queryState}
        eventsHook={eventsHook}
        searchController={searchController}
      />,
    )

    useCalendarPanelStateMock.mockReturnValue({
      dispatch,
      ui: {
        sidebarMode: "create",
        bodyMode: "calendar",
        editingEvent: null,
        createDraftPreview: null,
        createPrefillIso: "2026-07-15T10:00:00.000Z",
        createFormVersion: 2,
        searchFocusVersion: 0,
      },
    })

    rerender(
      <CalendarPanelOrchastrator
        queryState={queryState}
        eventsHook={eventsHook}
        searchController={searchController}
      />,
    )

    expect(createFormMountMock).toHaveBeenCalledTimes(2)
    expect(createFormPropsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        initialStartDateTime: "2026-07-15T10:00:00.000Z",
        initialEndDateTime: "2026-07-15T10:00:00.000Z",
      }),
    )
  })
})
