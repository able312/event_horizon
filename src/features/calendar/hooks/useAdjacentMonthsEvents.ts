import { useCallback, useMemo } from "react"

import type { Event } from "~/definitions/database"
import { useEventsMonthQuery } from "~/hooks/useEventsMonthQuery"
import { shiftMonthParam } from "~/lib/months"

// Availability has to be complete, so each month is fetched when the calendar shows
// it, even if cached. A cached month can be partial: saving an event into a month
// nobody has loaded caches just that event, and nothing fetches the rest, because
// month reads only go live after a fetch. The fetch also makes the month live.
const MONTH_QUERY_OPTIONS = {
  fetchPolicy: "always",
  refetchOnMount: "always",
  refetchOnWindowFocus: false,
} as const

export type AdjacentMonthsStatus = "loading" | "error" | "ready"

type MonthQueryState = {
  isError: boolean
  isFetching: boolean
  isSuccess: boolean
}

/**
 * Whether the months can be trusted: `error` if any read failed (cached events may
 * be incomplete), `loading` until every month has been fetched at least once.
 */
export function getAdjacentMonthsStatus(queries: MonthQueryState[]): AdjacentMonthsStatus {
  if (queries.some((query) => query.isError && !query.isFetching)) return "error"
  if (queries.some((query) => !query.isSuccess || query.isFetching)) return "loading"
  return "ready"
}

type AdjacentMonthsEvents = {
  events: Event[]
  status: AdjacentMonthsStatus
  /** Refetches the months that failed. */
  retry: () => void
}

/**
 * Events for a month and the months either side of it, so a calendar can mark
 * the neighbouring days it shows, and flipping a month is already loaded.
 */
export function useAdjacentMonthsEvents(month: string): AdjacentMonthsEvents {
  const previous = useEventsMonthQuery(shiftMonthParam(month, -1), MONTH_QUERY_OPTIONS)
  const current = useEventsMonthQuery(month, MONTH_QUERY_OPTIONS)
  const next = useEventsMonthQuery(shiftMonthParam(month, 1), MONTH_QUERY_OPTIONS)

  const events = useMemo(
    () => [...previous.events, ...current.events, ...next.events],
    [previous.events, current.events, next.events],
  )

  const queries = [previous.monthQuery, current.monthQuery, next.monthQuery]
  const status = getAdjacentMonthsStatus(queries)

  const { refetch: refetchPrevious, isError: previousFailed } = previous.monthQuery
  const { refetch: refetchCurrent, isError: currentFailed } = current.monthQuery
  const { refetch: refetchNext, isError: nextFailed } = next.monthQuery
  const retry = useCallback(() => {
    if (previousFailed) void refetchPrevious()
    if (currentFailed) void refetchCurrent()
    if (nextFailed) void refetchNext()
  }, [previousFailed, currentFailed, nextFailed, refetchPrevious, refetchCurrent, refetchNext])

  return { events, status, retry }
}
