import type { EventStatus, EventType } from "~/definitions/database"
import type { EventsSearchParams } from "~/hooks/useEventsSearchQuery"
import type { EventsQueryState } from "~/hooks/useEventsQueryState"
import { toLocalDateEndExclusiveIso, toLocalDateStartIso } from "~/lib/months"

const DEFAULT_SEARCH_PAGE_SIZE = 50

export type CalendarSearchFilters = {
  dateFrom: string
  dateTo: string
}

export type CalendarSearchPagination = {
  page: number
  pageSize: number
}

export type CalendarSearchUiState = CalendarSearchFilters & CalendarSearchPagination

export type CalendarSearchInput = {
  query: string
  type: EventType | null
  status: EventStatus | null
  undated: boolean
}

export function createInitialCalendarSearchUiState(): CalendarSearchUiState {
  return {
    dateFrom: "",
    dateTo: "",
    page: 0,
    pageSize: DEFAULT_SEARCH_PAGE_SIZE,
  }
}

export function buildCalendarSearchInput(queryState: EventsQueryState): CalendarSearchInput {
  return {
    query: queryState.search?.trim() ?? "",
    type: queryState.type,
    status: queryState.status,
    undated: queryState.undated,
  }
}

/** An undated search ignores the date range: no undated event could fall inside one. */
export function buildEventsSearchParams(
  input: CalendarSearchInput,
  uiState: CalendarSearchUiState,
): EventsSearchParams {
  return {
    query: input.query,
    type: input.type,
    status: input.status,
    startFrom: input.undated ? null : toLocalDateStartIso(uiState.dateFrom),
    startTo: input.undated ? null : toLocalDateEndExclusiveIso(uiState.dateTo),
    noDate: input.undated,
    page: uiState.page,
    pageSize: uiState.pageSize,
  }
}
