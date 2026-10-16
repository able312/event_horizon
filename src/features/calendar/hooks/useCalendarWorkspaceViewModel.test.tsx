import { act, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { MemoryRouter, useLocation } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { EventRequest, NewEvent } from "~/definitions/database"
import type { UseEventsReturn } from "~/hooks/useEvents"
import { useEventsQueryState } from "~/hooks/useEventsQueryState"
import { CalendarPanelStateProvider } from "../state/CalendarSidePanelProvider"
import { useCalendarPanelState } from "../state/useCalendarPanelState"
import type { UseCalendarSearchControllerReturn } from "./useCalendarSearchController"
import { useCalendarWorkspaceViewModel } from "./useCalendarWorkspaceViewModel"

const { acceptRequest, navigate } = vi.hoisted(() => ({ acceptRequest: vi.fn(), navigate: vi.fn() }))
vi.mock("react-router", async (importOriginal) => ({
  ...await importOriginal<typeof import("react-router")>(),
  useNavigate: () => navigate,
}))
vi.mock("~/hooks/useEventRequests", () => ({ useEventRequests: () => ({ acceptRequest }) }))
vi.mock("~/lib/hotKeys", () => ({ useHotkey: vi.fn() }))

const request: EventRequest = {
  id: "req-1", responseId: "resp-1", submittedAt: "2026-10-16T15:00:00.000Z", receivedAt: "2026-10-16T15:00:01.000Z", eventName: null,
  firstName: "Jane", lastName: "Smith", organizationName: null, email: "jane@example.test", phone: "555-0100",
  eventType: "wedding", preferredDate: "2027-06-20", alternateDate: null, startTime: "18:30",
  guestCount: 120, details: null, referralSource: null, extraAnswers: [],
  status: "pending", eventId: null, reviewedBy: null, reviewedAt: null,
}
const event: NewEvent = { title: "Wedding", type: "wedding", status: "new_lead" }
const client = { contactId: "contact-1" } as const
const eventsHook = { createEvent: vi.fn(), updateEvent: vi.fn() } as unknown as UseEventsReturn
const searchController = { reset: vi.fn() } as unknown as UseCalendarSearchControllerReturn

function PanelProvider({ children }: { children: ReactNode }) {
  const queryState = useEventsQueryState()
  return (
    <CalendarPanelStateProvider
      bodyMode={queryState.state.view === "inbox" ? "inbox" : "calendar"}
      onBodyModeChange={queryState.setView}
    >
      {children}
    </CalendarPanelStateProvider>
  )
}
function wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter initialEntries={["/events?date=2026-10&view=inbox"]}><PanelProvider>{children}</PanelProvider></MemoryRouter>
}
function useSubject() {
  const queryState = useEventsQueryState()
  const vm = useCalendarWorkspaceViewModel(queryState, eventsHook, searchController)
  return { vm, location: useLocation(), ...useCalendarPanelState() }
}

describe("request acceptance navigation", () => {
  beforeEach(() => vi.resetAllMocks())

  it("opens the accepted event with an Inbox return destination after saving", async () => {
    let resolveAcceptance!: (value: { id: string }) => void
    acceptRequest.mockReturnValue(new Promise((resolve) => { resolveAcceptance = resolve }))
    const { result } = renderHook(useSubject, { wrapper })
    act(() => result.current.vm.panelActions.openReviewRequestPanel(request))
    let saving!: Promise<void>
    act(() => { saving = result.current.vm.mutations.onAcceptRequest(event, client) })
    expect(result.current.location.pathname).toBe("/events")
    await act(async () => { resolveAcceptance({ id: "new-event" }); await saving })
    expect(acceptRequest).toHaveBeenCalledWith("req-1", event, client)
    expect(navigate).toHaveBeenCalledWith("/events/new-event?returnTo=%2Fevents%3Fdate%3D2026-10%26view%3Dinbox")
    expect(result.current.ui.selectedRequestId).toBeNull()
  })

  it("keeps the review open when acceptance fails", async () => {
    acceptRequest.mockRejectedValue(new Error("Save failed"))
    const { result } = renderHook(useSubject, { wrapper })
    act(() => result.current.vm.panelActions.openReviewRequestPanel(request))
    await act(async () => {
      await expect(result.current.vm.mutations.onAcceptRequest(event, client)).rejects.toThrow("Save failed")
    })
    expect(result.current.location.pathname).toBe("/events")
    expect(navigate).not.toHaveBeenCalled()
    expect(result.current.ui.reviewingRequest?.id).toBe("req-1")
  })

  it("restores the Inbox from the URL and persists switching back to the calendar", () => {
    const { result } = renderHook(useSubject, { wrapper })
    expect(result.current.ui.bodyMode).toBe("inbox")
    act(() => result.current.dispatch({ type: "OPEN_CALENDAR_VIEW" }))
    expect(result.current.ui.bodyMode).toBe("calendar")
    expect(new URLSearchParams(result.current.location.search).has("view")).toBe(false)
    act(() => result.current.vm.panelActions.toggleInboxView())
    expect(result.current.ui.bodyMode).toBe("inbox")
    expect(new URLSearchParams(result.current.location.search).get("view")).toBe("inbox")
  })
})
