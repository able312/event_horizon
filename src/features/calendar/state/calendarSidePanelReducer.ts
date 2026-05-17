// src/features/calendar/state/calendarWorkspaceReducer.ts

import type { Event } from "~/definitions/database"
import type { CalendarDraftPreview } from "~/features/calendar/lib/calendarDraftPreview"

export type SidebarMode = "default" | "search" | "create" | "edit"
export type BodyMode = "calendar" | "unscheduled"

export interface CalendarSidePanelState {
  sidebarMode: SidebarMode
  bodyMode: BodyMode
  editingEvent: Event | null
  createPrefillIso: string | null
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
  TOGGLE_UNSCHEDULED_VIEW: "TOGGLE_UNSCHEDULED_VIEW",
  OPEN_CALENDAR_VIEW: "OPEN_CALENDAR_VIEW",
  SET_CREATE_DRAFT_PREVIEW: "SET_CREATE_DRAFT_PREVIEW",
} as const

export type CalendarSidePanelAction =
  | { type: "OPEN_DEFAULT" }
  | { type: "OPEN_SEARCH" }
  | { type: "CLOSE_SEARCH" }
  | { type: "OPEN_CREATE"; prefillIso: string | null }
  | { type: "OPEN_EDIT"; event: Event }
  | { type: "TOGGLE_UNSCHEDULED_VIEW" }
  | { type: "OPEN_CALENDAR_VIEW" }
  | { type: "SET_CREATE_DRAFT_PREVIEW"; preview: CalendarDraftPreview | null }

  

export const initialCalendarSidePanelState: CalendarSidePanelState = {
  sidebarMode: "default",
  bodyMode: "calendar",
  editingEvent: null,
  createPrefillIso: null,
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
      }

    case ACTIONS.OPEN_SEARCH:
      return {
        ...state,
        sidebarMode: "search",
        editingEvent: null,
        createDraftPreview: null,
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
        createFormVersion: state.createFormVersion + 1,
      }

    case ACTIONS.OPEN_EDIT:
      return {
        ...state,
        sidebarMode: "edit",
        createDraftPreview: null,
        editingEvent: action.event,
      }

    case ACTIONS.TOGGLE_UNSCHEDULED_VIEW:
      return {
        ...state,
        bodyMode: state.bodyMode === "calendar" ? "unscheduled" : "calendar",
      }

    case ACTIONS.OPEN_CALENDAR_VIEW:
      return {
        ...state,
        bodyMode: "calendar",
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
