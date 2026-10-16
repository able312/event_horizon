import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"

import type { EventSearchResponse } from "~/definitions/ipc"
import type { EventStatus, EventType } from "~/definitions/database"
import { eventQueries } from "~/lib/data/queries"

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
  const enabled = normalizedQuery.length >= 2 || Boolean(
    params.type || params.status || params.startFrom || params.startTo,
  )
  // The server rejects an empty or inverted range; flag it rather than fetch a guaranteed error.
  const invalidDateRange = Boolean(params.startFrom && params.startTo && params.startFrom >= params.startTo)

  const query = useQuery({
    ...eventQueries.search({
      query: normalizedQuery,
      type: params.type,
      status: params.status,
      startFrom: params.startFrom,
      startTo: params.startTo,
      page: params.page,
      pageSize: params.pageSize,
    }),
    enabled: enabled && !invalidDateRange,
  })

  const result = useMemo(() => {
    if (!enabled || invalidDateRange) return { ...EMPTY_RESULT, pageSize: params.pageSize }
    return query.data ?? { ...EMPTY_RESULT, page: params.page, pageSize: params.pageSize }
  }, [enabled, invalidDateRange, params.page, params.pageSize, query.data])

  return {
    ...query,
    enabled,
    invalidDateRange,
    result,
  }
}
