import { describe, expect, it } from "vitest"
import type { EventRequest } from "~/definitions/database"

import {
  ACTIONS,
  calendarSidePanelReducer,
  createInitialCalendarSidePanelState,
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

  it("ends a request review when leaving the Inbox, but keeps a plain create form", () => {
    const reviewing = calendarSidePanelReducer(initialCalendarSidePanelState, {
      type: ACTIONS.OPEN_REVIEW_REQUEST,
      request: { id: "req-1" } as EventRequest,
    })
    for (const type of [ACTIONS.TOGGLE_INBOX_VIEW, ACTIONS.OPEN_CALENDAR_VIEW] as const) {
      expect(calendarSidePanelReducer(reviewing, { type })).toMatchObject({ sidebarMode: "default", reviewingRequest: null, selectedRequestId: null })
    }

    const creating = calendarSidePanelReducer(initialCalendarSidePanelState, { type: ACTIONS.OPEN_CREATE, prefillIso: "2026-10-20" })
    expect(calendarSidePanelReducer(creating, { type: ACTIONS.TOGGLE_INBOX_VIEW })).toMatchObject({ sidebarMode: "create", createPrefillIso: "2026-10-20" })
  })
})

describe("createInitialCalendarSidePanelState", () => {
  it("reopens the search panel when the calendar mounts with a search in the URL", () => {
    expect(createInitialCalendarSidePanelState({ hasActiveSearch: true, bodyMode: "calendar" }).sidebarMode).toBe("search")
  })

  it("keeps the default panel without a search, or in the Inbox", () => {
    expect(createInitialCalendarSidePanelState({ hasActiveSearch: false, bodyMode: "calendar" })).toBe(initialCalendarSidePanelState)
    expect(createInitialCalendarSidePanelState({ hasActiveSearch: true, bodyMode: "inbox" })).toBe(initialCalendarSidePanelState)
  })
})
