import type { QueryClient } from "@tanstack/react-query"
import type { Event } from "~/definitions/database"
import { getMonthParamForDateTime, normalizeMonthParam } from "~/lib/months"

export type EventScope =
  | {
      kind: "month"
      month: string
    }
  | {
      kind: "unscheduled"
    }

export const EVENTS_MONTH_QUERY_KEY_PREFIX = ["events", "month"] as const
export const EVENTS_UNSCHEDULED_QUERY_KEY = ["events", "unscheduled"] as const
export const EVENTS_SEARCH_QUERY_KEY_PREFIX = ["events", "search"] as const

export function getEventsMonthQueryKey(month: string) {
  const normalizedMonth = normalizeMonthParam(month)
  if (!normalizedMonth) {
    throw new Error(`Invalid month query key: ${month}`)
  }

  return [...EVENTS_MONTH_QUERY_KEY_PREFIX, normalizedMonth] as const
}

export function getEventScopeFromStartDateTime(
  startDateTime: string | null | undefined,
): EventScope | null {
  if (!startDateTime) return { kind: "unscheduled" }

  const month = getMonthParamForDateTime(startDateTime)
  if (!month) return null

  return { kind: "month", month }
}

export function getEventScopeFromEvent(
  event: Pick<Event, "startDateTime"> | null | undefined,
): EventScope | null {
  if (!event) return null
  return getEventScopeFromStartDateTime(event.startDateTime)
}

export function getEventScopeQueryKey(scope: EventScope) {
  return scope.kind === "month"
    ? getEventsMonthQueryKey(scope.month)
    : EVENTS_UNSCHEDULED_QUERY_KEY
}

export async function invalidateEventScope(
  queryClient: QueryClient,
  scope: EventScope,
): Promise<void> {
  await queryClient.invalidateQueries({
    queryKey: getEventScopeQueryKey(scope),
  })
}

export async function invalidateEventScopes(
  queryClient: QueryClient,
  scopes: Array<EventScope | null | undefined>,
): Promise<void> {
  const uniqueScopes = new Map<string, EventScope>()

  for (const scope of scopes) {
    if (!scope) continue

    const key =
      scope.kind === "month"
        ? `month:${scope.month}`
        : scope.kind
    uniqueScopes.set(key, scope)
  }

  for (const scope of uniqueScopes.values()) {
    await invalidateEventScope(queryClient, scope)
  }
}

export async function invalidateAllEventScopes(
  queryClient: QueryClient,
): Promise<void> {
  await queryClient.invalidateQueries({
    queryKey: EVENTS_MONTH_QUERY_KEY_PREFIX,
  })
  await queryClient.invalidateQueries({
    queryKey: EVENTS_UNSCHEDULED_QUERY_KEY,
  })
}

export async function invalidateEventsSearchQueries(
  queryClient: QueryClient,
): Promise<void> {
  await queryClient.invalidateQueries({
    queryKey: EVENTS_SEARCH_QUERY_KEY_PREFIX,
  })
}

export function findCachedEventById(
  queryClient: QueryClient,
  eventId: string,
): Event | null {
  for (const [, maybeEvents] of queryClient.getQueriesData<Event[]>({
    queryKey: EVENTS_MONTH_QUERY_KEY_PREFIX,
  })) {
    const found = maybeEvents?.find((event) => event.id === eventId)
    if (found) return found
  }

  const unscheduledEvents = queryClient.getQueryData<Event[]>(
    EVENTS_UNSCHEDULED_QUERY_KEY,
  )
  return unscheduledEvents?.find((event) => event.id === eventId) ?? null
}
