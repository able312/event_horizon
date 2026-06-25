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
  }
}

export function buildEventsSearchParams(
  input: CalendarSearchInput,
  uiState: CalendarSearchUiState,
): EventsSearchParams {
  return {
    query: input.query,
    type: input.type,
    status: input.status,
    startFrom: toLocalDateStartIso(uiState.dateFrom),
    startTo: toLocalDateEndExclusiveIso(uiState.dateTo),
    page: uiState.page,
    pageSize: uiState.pageSize,
  }
}
