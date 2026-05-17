import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"

import type { EventSearchResponse } from "~/definitions/ipc"
import type { EventStatus, EventType } from "~/definitions/database"
import * as eventsApi from "~/lib/ipc/ipcEventsQueries"

export type EventsSearchParams = {
  query: string
  type: EventType | null
  status: EventStatus | null
  startFrom: string | null
  startTo: string | null
  page: number
  pageSize: number
}

const EMPTY_RESULT: EventSearchResponse = {
  items: [],
  total: 0,
  page: 0,
  pageSize: 50,
  hasMore: false,
}

export function useEventsSearchQuery(params: EventsSearchParams) {
  const normalizedQuery = params.query.trim()
  const enabled = normalizedQuery.length >= 2

  const query = useQuery({
    queryKey: [
      "events",
      "search",
      normalizedQuery,
      params.type,
      params.status,
      params.startFrom,
      params.startTo,
      params.page,
      params.pageSize,
    ],
    queryFn: () =>
      eventsApi.searchEvents({
        query: normalizedQuery,
        type: params.type,
        status: params.status,
        startFrom: params.startFrom,
        startTo: params.startTo,
        page: params.page,
        pageSize: params.pageSize,
      }),
    enabled,
  })

  const result = useMemo(() => {
    if (!enabled) return { ...EMPTY_RESULT, pageSize: params.pageSize }
    return query.data ?? { ...EMPTY_RESULT, page: params.page, pageSize: params.pageSize }
  }, [enabled, params.page, params.pageSize, query.data])

  return {
    ...query,
    enabled,
    result,
  }
}
