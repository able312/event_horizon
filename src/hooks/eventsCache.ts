import type { QueryClient } from "@tanstack/react-query"
import type { Event } from "~/definitions/database"
import { eventKeys } from "~/lib/data/queries"
import { getMonthParamForDateTime, normalizeMonthParam } from "~/lib/months"

export type EventScope =
  | {
      kind: "month"
      month: string
    }
  | {
      kind: "unscheduled"
    }

export function getEventsMonthQueryKey(month: string) {
  const normalizedMonth = normalizeMonthParam(month)
  if (!normalizedMonth) {
    throw new Error(`Invalid month query key: ${month}`)
  }

  return eventKeys.month(normalizedMonth)
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
    : eventKeys.unscheduled()
}

async function invalidateEventScope(
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
    queryKey: eventKeys.months(),
  })
  await queryClient.invalidateQueries({
    queryKey: eventKeys.unscheduled(),
  })
}

export async function invalidateEventsSearchQueries(
  queryClient: QueryClient,
): Promise<void> {
  await queryClient.invalidateQueries({
    queryKey: eventKeys.searches(),
  })
}

export function findCachedEventById(
  queryClient: QueryClient,
  eventId: string,
): Event | null {
  for (const [, maybeEvents] of queryClient.getQueriesData<Event[]>({
    queryKey: eventKeys.months(),
  })) {
    const found = maybeEvents?.find((event) => event.id === eventId)
    if (found) return found
  }

  const unscheduledEvents = queryClient.getQueryData<Event[]>(
    eventKeys.unscheduled(),
  )
  return unscheduledEvents?.find((event) => event.id === eventId) ?? null
}
