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

vi.mock("./content/InboxPanel", () => ({
  default: () => <div data-testid="inbox-panel-mock" />,
}))

vi.mock("~/hooks/useEventRequests", () => ({
  useEventRequests: () => ({ requests: [], requestsQuery: {} }),
}))

vi.mock("~/hooks/useNewLeads", () => ({
  useNewLeads: () => ({ leads: [], leadsQuery: {} }),
}))

vi.mock("~/hooks/useEventContacts", () => ({
  usePrimaryClients: () => ({ data: undefined }),
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
        toggleInboxView: vi.fn(),
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
        onDeleteRequest={vi.fn()}
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
        onDeleteRequest={vi.fn()}
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

  it("starts the create form from the request under review and saves it by accepting the request", () => {
    const onCreateEvent = vi.fn()
    const onAcceptRequest = vi.fn()
    useCalendarWorkspaceViewModelMock.mockReturnValue({
      panelActions: { openDefaultPanel: vi.fn() },
      mutations: { onCreateEvent, onAcceptRequest, onSaveEventUpdates: vi.fn() },
    })
    useCalendarPanelStateMock.mockReturnValue({
      dispatch: vi.fn(),
      ui: {
        sidebarMode: "create",
        bodyMode: "inbox",
        editingEvent: null,
        createDraftPreview: null,
        createPrefillIso: null,
        reviewingRequest: {
          id: "req-1", submittedAt: "2026-10-16T15:00:00.000Z", eventName: null, firstName: "Jane", lastName: "Smith", organizationName: null,
          email: "jane@example.test", phone: "555-0100", eventType: "wedding", preferredDate: null, alternateDate: null,
          startTime: null, guestCount: 80, details: null, referralSource: null, extraAnswers: [],
        },
        createFormVersion: 1,
        searchFocusVersion: 0,
      },
    })

    render(
      <CalendarPanelOrchastrator
        queryState={{ state: {} } as never}
        eventsHook={{} as never}
        searchController={{} as never}
        onDeleteRequest={vi.fn()}
      />,
    )

    expect(createFormPropsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        prefill: expect.objectContaining({ values: expect.objectContaining({ title: "Smith Wedding", maxGuests: 80 }) }),
        onCreate: onAcceptRequest,
      }),
    )
  })

  it("shows the Inbox list in place of the mini calendar while the Inbox is open", () => {
    useCalendarWorkspaceViewModelMock.mockReturnValue({ panelActions: {}, mutations: {} })
    const ui = { sidebarMode: "default", bodyMode: "inbox", selectedRequestId: null, reviewingRequest: null }
    useCalendarPanelStateMock.mockReturnValue({ dispatch: vi.fn(), ui })
    const queryState = { state: { date: "2026-05" }, setDate: vi.fn() } as never

    const { getByTestId, queryByTestId, rerender } = render(
      <CalendarPanelOrchastrator queryState={queryState} eventsHook={{} as never} searchController={{} as never} onDeleteRequest={vi.fn()} />,
    )
    expect(getByTestId("inbox-panel-mock")).toBeTruthy()
    expect(queryByTestId("default-panel-mock")).toBeNull()

    useCalendarPanelStateMock.mockReturnValue({ dispatch: vi.fn(), ui: { ...ui, bodyMode: "calendar" } })
    rerender(
      <CalendarPanelOrchastrator queryState={queryState} eventsHook={{} as never} searchController={{} as never} onDeleteRequest={vi.fn()} />,
    )
    expect(getByTestId("default-panel-mock")).toBeTruthy()
    expect(queryByTestId("inbox-panel-mock")).toBeNull()
  })
})
