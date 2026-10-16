import { describe, expect, it } from "vitest"
import type { EventRequest } from "~/definitions/database"

import {
  ACTIONS,
  calendarSidePanelReducer,
  initialCalendarSidePanelState,
} from "./calendarSidePanelReducer"

describe("calendarSidePanelReducer", () => {
  it("toggles body mode between calendar and inbox", () => {
    const opened = calendarSidePanelReducer(initialCalendarSidePanelState, {
      type: ACTIONS.TOGGLE_INBOX_VIEW,
    })
    expect(opened.bodyMode).toBe("inbox")

    const closed = calendarSidePanelReducer(opened, {
      type: ACTIONS.TOGGLE_INBOX_VIEW,
    })
    expect(closed.bodyMode).toBe("calendar")
  })

  it("keeps body mode through sidebar mode transitions", () => {
    const inboxState = calendarSidePanelReducer(initialCalendarSidePanelState, {
      type: ACTIONS.TOGGLE_INBOX_VIEW,
    })

    const openedSearch = calendarSidePanelReducer(inboxState, {
      type: ACTIONS.OPEN_SEARCH,
    })
    const openedCreate = calendarSidePanelReducer(openedSearch, {
      type: ACTIONS.OPEN_CREATE,
      prefillIso: null,
    })

    expect(openedSearch.bodyMode).toBe("inbox")
    expect(openedCreate.bodyMode).toBe("inbox")
  })

  it("opens the create form for a request and clears it when another sidebar opens", () => {
    const request = { id: "req-1" } as EventRequest
    const reviewing = calendarSidePanelReducer(initialCalendarSidePanelState, {
      type: ACTIONS.OPEN_REVIEW_REQUEST,
      request,
    })
    expect(reviewing).toMatchObject({ sidebarMode: "create", reviewingRequest: request, selectedRequestId: "req-1", createFormVersion: 1 })

    const plainCreate = calendarSidePanelReducer(reviewing, { type: ACTIONS.OPEN_CREATE, prefillIso: null })
    expect(plainCreate.reviewingRequest).toBeNull()
    expect(plainCreate.createFormVersion).toBe(2)

    expect(calendarSidePanelReducer(reviewing, { type: ACTIONS.OPEN_DEFAULT }).reviewingRequest).toBeNull()
    expect(calendarSidePanelReducer(reviewing, { type: ACTIONS.OPEN_SEARCH }).reviewingRequest).toBeNull()
  })

  it("selects a request in the Inbox and forgets it when leaving the Inbox", () => {
    const inbox = calendarSidePanelReducer(initialCalendarSidePanelState, { type: ACTIONS.TOGGLE_INBOX_VIEW })
    const selected = calendarSidePanelReducer(inbox, { type: ACTIONS.SELECT_REQUEST, requestId: "req-1" })
    expect(selected.selectedRequestId).toBe("req-1")
    expect(calendarSidePanelReducer(selected, { type: ACTIONS.OPEN_DEFAULT }).selectedRequestId).toBe("req-1")
    expect(calendarSidePanelReducer(selected, { type: ACTIONS.SELECT_REQUEST, requestId: null }).selectedRequestId).toBeNull()
    expect(calendarSidePanelReducer(selected, { type: ACTIONS.TOGGLE_INBOX_VIEW }).selectedRequestId).toBeNull()
    expect(calendarSidePanelReducer(selected, { type: ACTIONS.OPEN_CALENDAR_VIEW }).selectedRequestId).toBeNull()
  })
})
