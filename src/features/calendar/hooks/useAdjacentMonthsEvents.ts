import { useMemo } from "react"

import type { Event } from "~/definitions/database"
import { useEventsMonthQuery } from "~/hooks/useEventsMonthQuery"
import { shiftMonthParam } from "~/lib/months"

// Month reads are live once cached, so a cached month never needs refetching.
const MONTH_QUERY_OPTIONS = {
  fetchPolicy: "missing-only",
  staleTime: Number.POSITIVE_INFINITY,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
} as const

/**
 * Events for a month and the months either side of it, so a calendar can mark
 * the neighbouring days it shows, and flipping a month is already loaded.
 */
export function useAdjacentMonthsEvents(month: string): Event[] {
  const previous = useEventsMonthQuery(shiftMonthParam(month, -1), MONTH_QUERY_OPTIONS)
  const current = useEventsMonthQuery(month, MONTH_QUERY_OPTIONS)
  const next = useEventsMonthQuery(shiftMonthParam(month, 1), MONTH_QUERY_OPTIONS)

  return useMemo(
    () => [...previous.events, ...current.events, ...next.events],
    [previous.events, current.events, next.events],
  )
}
