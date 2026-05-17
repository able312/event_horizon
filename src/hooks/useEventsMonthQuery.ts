import { useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query"

import type { Event } from "~/definitions/database"
import * as eventsApi from "~/lib/ipc/ipcEventsQueries"
import { getCurrentMonthParam, normalizeMonthParam } from "~/lib/months"

import { getEventsMonthQueryKey } from "./eventsCache"

type EventsMonthFetchPolicy = "always" | "missing-only"

interface UseEventsMonthQueryOptions {
  fetchPolicy?: EventsMonthFetchPolicy
  staleTime?: number
  refetchOnMount?: boolean | "always"
  refetchOnWindowFocus?: boolean
}

interface UseEventsMonthQueryReturn {
  month: string
  hasCachedData: boolean
  monthQuery: UseQueryResult<Event[], Error>
  events: Event[]
}

export function useEventsMonthQuery(
  month: string,
  options: UseEventsMonthQueryOptions = {},
): UseEventsMonthQueryReturn {
  const queryClient = useQueryClient()
  const selectedMonth = normalizeMonthParam(month) ?? getCurrentMonthParam()
  const queryKey = getEventsMonthQueryKey(selectedMonth)
  const cachedEvents = queryClient.getQueryData<Event[]>(queryKey)
  const hasCachedData = cachedEvents !== undefined
  const fetchPolicy = options.fetchPolicy ?? "always"

  const monthQuery = useQuery<Event[]>({
    queryKey,
    queryFn: () => eventsApi.getEventsByMonth(selectedMonth),
    enabled: fetchPolicy === "always" || !hasCachedData,
    staleTime: options.staleTime,
    refetchOnMount: options.refetchOnMount,
    refetchOnWindowFocus: options.refetchOnWindowFocus,
  })

  return {
    month: selectedMonth,
    hasCachedData,
    monthQuery,
    events: monthQuery.data ?? cachedEvents ?? [],
  }
}
