import { describe, expect, it } from "vitest"
import type { EventRequest } from "~/definitions/database"

import {
  ACTIONS,
  calendarSidePanelReducer,
  initialCalendarSidePanelState,
} from "./calendarSidePanelReducer"

describe("calendarSidePanelReducer", () => {
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
    const selected = calendarSidePanelReducer(initialCalendarSidePanelState, { type: ACTIONS.SELECT_REQUEST, requestId: "req-1" })
    expect(selected.selectedRequestId).toBe("req-1")
    expect(calendarSidePanelReducer(selected, { type: ACTIONS.OPEN_DEFAULT }).selectedRequestId).toBe("req-1")
    expect(calendarSidePanelReducer(selected, { type: ACTIONS.SELECT_REQUEST, requestId: null }).selectedRequestId).toBeNull()
    expect(calendarSidePanelReducer(selected, { type: ACTIONS.TOGGLE_INBOX_VIEW }).selectedRequestId).toBeNull()
    expect(calendarSidePanelReducer(selected, { type: ACTIONS.OPEN_CALENDAR_VIEW }).selectedRequestId).toBeNull()
  })
})
