import { useCallback, useEffect, useMemo, useState } from "react"

import { useEventsSearchQuery } from "~/hooks/useEventsSearchQuery"
import type { UseEventsQueryStateReturn } from "~/hooks/useEventsQueryState"

import {
  buildCalendarSearchInput,
  buildEventsSearchParams,
  createInitialCalendarSearchUiState,
} from "../lib/searchParams"

export function useCalendarSearchController(queryState: UseEventsQueryStateReturn) {
  const initialState = useMemo(() => createInitialCalendarSearchUiState(), [])
  const [dateFrom, setDateFrom] = useState(initialState.dateFrom)
  const [dateTo, setDateTo] = useState(initialState.dateTo)
  const [page, setPage] = useState(initialState.page)

  const input = useMemo(() => buildCalendarSearchInput(queryState.state), [queryState.state])

  const searchParams = useMemo(
    () =>
      buildEventsSearchParams(input, {
        dateFrom,
        dateTo,
        page,
        pageSize: initialState.pageSize,
      }),
    [dateFrom, dateTo, initialState.pageSize, input, page],
  )

  const searchQuery = useEventsSearchQuery(searchParams)

  useEffect(() => {
    setPage(0)
  }, [input.query, input.type, input.status, dateFrom, dateTo])

  const reset = useCallback(() => {
    setDateFrom(initialState.dateFrom)
    setDateTo(initialState.dateTo)
    setPage(initialState.page)
  }, [initialState.dateFrom, initialState.dateTo, initialState.page])

  const pagination = useMemo(() => {
    const canPrev = page > 0
    const canNext = Boolean(searchQuery.result.hasMore)

    return {
      page,
      canPrev,
      canNext,
      goPrev: () => setPage((prev) => Math.max(0, prev - 1)),
      goNext: () => setPage((prev) => prev + 1),
      setPage,
    }
  }, [page, searchQuery.result.hasMore])

  return {
    filters: {
      dateFrom,
      dateTo,
      setDateFrom,
      setDateTo,
    },
    pagination,
    searchQuery,
    reset,
  }
}

export type UseCalendarSearchControllerReturn = ReturnType<typeof useCalendarSearchController>
