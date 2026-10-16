// src/features/calendar/state/calendarWorkspaceReducer.ts

import type { Event, EventRequest } from "~/definitions/database"
import type { CalendarDraftPreview } from "~/features/calendar/lib/calendarDraftPreview"

export type SidebarMode = "default" | "search" | "create" | "edit"
export type BodyMode = "calendar" | "inbox"

export interface CalendarSidePanelState {
  sidebarMode: SidebarMode
  bodyMode: BodyMode
  editingEvent: Event | null
  createPrefillIso: string | null
  /** Set while the create form is reviewing a website request; saving it accepts the request. */
  reviewingRequest: EventRequest | null
  /** The website request shown in the Inbox body. */
  selectedRequestId: string | null
  createDraftPreview: CalendarDraftPreview | null
  createFormVersion: number
  searchFocusVersion: number
}

export const ACTIONS = {
  OPEN_DEFAULT: "OPEN_DEFAULT",
  OPEN_SEARCH: "OPEN_SEARCH",
  CLOSE_SEARCH: "CLOSE_SEARCH",
  OPEN_CREATE: "OPEN_CREATE",
  OPEN_EDIT: "OPEN_EDIT",
  OPEN_REVIEW_REQUEST: "OPEN_REVIEW_REQUEST",
  SELECT_REQUEST: "SELECT_REQUEST",
  TOGGLE_INBOX_VIEW: "TOGGLE_INBOX_VIEW",
  OPEN_CALENDAR_VIEW: "OPEN_CALENDAR_VIEW",
  SET_CREATE_DRAFT_PREVIEW: "SET_CREATE_DRAFT_PREVIEW",
} as const

export type CalendarSidePanelAction =
  | { type: "OPEN_DEFAULT" }
  | { type: "OPEN_SEARCH" }
  | { type: "CLOSE_SEARCH" }
  | { type: "OPEN_CREATE"; prefillIso: string | null }
  | { type: "OPEN_EDIT"; event: Event }
  | { type: "OPEN_REVIEW_REQUEST"; request: EventRequest }
  | { type: "SELECT_REQUEST"; requestId: string | null }
  | { type: "TOGGLE_INBOX_VIEW" }
  | { type: "OPEN_CALENDAR_VIEW" }
  | { type: "SET_CREATE_DRAFT_PREVIEW"; preview: CalendarDraftPreview | null }

  

export const initialCalendarSidePanelState: CalendarSidePanelState = {
  sidebarMode: "default",
  bodyMode: "calendar",
  editingEvent: null,
  createPrefillIso: null,
  reviewingRequest: null,
  selectedRequestId: null,
  createDraftPreview: null,
  createFormVersion: 0,
  searchFocusVersion: 0,
}

export function calendarSidePanelReducer(
  state: CalendarSidePanelState,
  action: CalendarSidePanelAction,
): CalendarSidePanelState {
  switch (action.type) {
    case ACTIONS.OPEN_DEFAULT:
      return {
        ...state,
        sidebarMode: "default",
        editingEvent: null,
        createDraftPreview: null,
        createPrefillIso: null,
        reviewingRequest: null,
      }

    case ACTIONS.OPEN_SEARCH:
      return {
        ...state,
        sidebarMode: "search",
        editingEvent: null,
        createDraftPreview: null,
        reviewingRequest: null,
        searchFocusVersion: state.searchFocusVersion + 1,
      }

    case ACTIONS.CLOSE_SEARCH:
      return {
        ...state,
        sidebarMode: "default",
      }

    case ACTIONS.OPEN_CREATE:
      return {
        ...state,
        sidebarMode: "create",
        editingEvent: null,
        createDraftPreview: null,
        createPrefillIso: action.prefillIso,
        reviewingRequest: null,
        createFormVersion: state.createFormVersion + 1,
      }

    case ACTIONS.OPEN_REVIEW_REQUEST:
      return {
        ...state,
        sidebarMode: "create",
        editingEvent: null,
        createDraftPreview: null,
        createPrefillIso: null,
        reviewingRequest: action.request,
        selectedRequestId: action.request.id,
        createFormVersion: state.createFormVersion + 1,
      }

    case ACTIONS.SELECT_REQUEST:
      return {
        ...state,
        selectedRequestId: action.requestId,
      }

    case ACTIONS.OPEN_EDIT:
      return {
        ...state,
        sidebarMode: "edit",
        createDraftPreview: null,
        reviewingRequest: null,
        editingEvent: action.event,
      }

    case ACTIONS.TOGGLE_INBOX_VIEW:
      return {
        ...state,
        bodyMode: state.bodyMode === "calendar" ? "inbox" : "calendar",
        selectedRequestId: null,
      }

    case ACTIONS.OPEN_CALENDAR_VIEW:
      return {
        ...state,
        bodyMode: "calendar",
        selectedRequestId: null,
      }

    case ACTIONS.SET_CREATE_DRAFT_PREVIEW:
      return {
        ...state,
        createDraftPreview: action.preview,
      }

    default:
      return state
  }
}
