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
