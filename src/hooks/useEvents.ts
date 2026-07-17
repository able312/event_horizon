import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { Event, NewEvent, UpdateEvent } from "~/definitions/database"
import * as eventsApi from "~/lib/ipc/ipcEventsQueries"
import {
  EVENTS_MONTH_QUERY_KEY_PREFIX,
  EVENTS_SEARCH_QUERY_KEY_PREFIX,
  EVENTS_UNSCHEDULED_QUERY_KEY,
  findCachedEventById,
  getEventScopeFromEvent,
  getEventScopeFromStartDateTime,
  getEventScopeQueryKey,
  invalidateAllEventScopes,
  invalidateEventScopes,
  invalidateEventsSearchQueries,
} from "./eventsCache"
import { useEventsMonthQuery } from "./useEventsMonthQuery"

type SnapshotEntry = {
  key: readonly unknown[]
  data: Event[] | undefined
}

function sortEventsByStartDateTimeAsc(events: Event[]): Event[] {
  return [...events].sort((a, b) => {
    const aValue = a.startDateTime
      ? toEpochMilliseconds(a.startDateTime, Number.POSITIVE_INFINITY)
      : Number.POSITIVE_INFINITY
    const bValue = b.startDateTime
      ? toEpochMilliseconds(b.startDateTime, Number.POSITIVE_INFINITY)
      : Number.POSITIVE_INFINITY
    return aValue - bValue
  })
}

function sortEventsByCreatedAtAsc(events: Event[]): Event[] {
  return [...events].sort((a, b) => {
    const aValue = toEpochMilliseconds(a.createdAt, 0)
    const bValue = toEpochMilliseconds(b.createdAt, 0)
    return aValue - bValue
  })
}

function toEpochMilliseconds(value: string, fallback: number): number {
  const numericValue = Number(value)
  if (Number.isFinite(numericValue)) return numericValue

  const parsedValue = Date.parse(value)
  if (!Number.isNaN(parsedValue)) return parsedValue

  return fallback
}

function mergeSnapshot(target: SnapshotEntry[], next: SnapshotEntry): SnapshotEntry[] {
  const exists = target.some(
    (entry) => JSON.stringify(entry.key) === JSON.stringify(next.key),
  )
  return exists ? target : [...target, next]
}

export function useEvents(month: string) {
  const queryClient = useQueryClient()
  const { monthQuery, events: monthEvents } = useEventsMonthQuery(month)

  const unscheduledQuery = useQuery({
    queryKey: EVENTS_UNSCHEDULED_QUERY_KEY,
    queryFn: () => eventsApi.getUnscheduledEvents(),
  })

  const createMutation = useMutation({
    mutationFn: (newEvent: NewEvent) => eventsApi.createEvent(newEvent),
    onMutate: async (newEvent) => {
      await queryClient.cancelQueries({ queryKey: EVENTS_MONTH_QUERY_KEY_PREFIX })
      await queryClient.cancelQueries({ queryKey: EVENTS_UNSCHEDULED_QUERY_KEY })
      await queryClient.cancelQueries({ queryKey: EVENTS_SEARCH_QUERY_KEY_PREFIX })

      const nextScope = getEventScopeFromStartDateTime(newEvent.startDateTime)
      const snapshots: SnapshotEntry[] = []

      const optimisticEvent: Event = {
        ...(newEvent as Omit<Event, "id">),
        id: `temp_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: null,
      }

      if (nextScope) {
        const scopeKey = getEventScopeQueryKey(nextScope)
        snapshots.push({
          key: scopeKey,
          data: queryClient.getQueryData<Event[]>(scopeKey),
        })

        if (nextScope.kind === "month") {
          queryClient.setQueryData<Event[]>(scopeKey, (old = []) =>
            sortEventsByStartDateTimeAsc([...old, optimisticEvent]),
          )
        } else {
          queryClient.setQueryData<Event[]>(scopeKey, (old = []) =>
            sortEventsByCreatedAtAsc([...old, optimisticEvent]),
          )
        }
      }

      return { snapshots, nextScope }
    },
    onError: (_err, _variables, context) => {
      for (const snapshot of context?.snapshots ?? []) {
        queryClient.setQueryData(snapshot.key, snapshot.data)
      }
      toast.error("Failed to create event")
    },
    onSettled: async (_createdEvent, _err, _variables, context) => {
      await invalidateEventsSearchQueries(queryClient)

      if (context?.nextScope) {
        await invalidateEventScopes(queryClient, [context.nextScope])
        return
      }
      await invalidateAllEventScopes(queryClient)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateEvent }) =>
      eventsApi.updateEvent(id, updates),
    onMutate: async ({ id, updates }) => {
      const eventQueryKey = ["event", id] as const
      await queryClient.cancelQueries({ queryKey: EVENTS_MONTH_QUERY_KEY_PREFIX })
      await queryClient.cancelQueries({ queryKey: EVENTS_UNSCHEDULED_QUERY_KEY })
      await queryClient.cancelQueries({ queryKey: EVENTS_SEARCH_QUERY_KEY_PREFIX })
      await queryClient.cancelQueries({ queryKey: eventQueryKey })

      const snapshots: SnapshotEntry[] = []
      const previousEventById = queryClient.getQueryData<Event>(eventQueryKey) ?? undefined
      const previousEvent =
        findCachedEventById(queryClient, id) ??
        previousEventById ??
        null

      const previousScope = getEventScopeFromEvent(previousEvent)
      const nextStartDateTime =
        updates.startDateTime !== undefined
          ? updates.startDateTime
          : previousEvent?.startDateTime
      const nextScope =
        updates.startDateTime === undefined && !previousEvent
          ? null
          : getEventScopeFromStartDateTime(nextStartDateTime)

      if (!previousEvent) {
        return {
          snapshots,
          previousScope,
          nextScope,
          eventQueryKey,
          previousEventById,
        }
      }

      const nextEvent: Event = { ...previousEvent, ...updates }
      queryClient.setQueryData<Event>(eventQueryKey, (old) =>
        old ? { ...old, ...updates } : old,
      )

      if (previousScope) {
        const previousScopeKey = getEventScopeQueryKey(previousScope)
        snapshots.push({
          key: previousScopeKey,
          data: queryClient.getQueryData<Event[]>(previousScopeKey),
        })

        queryClient.setQueryData<Event[]>(previousScopeKey, (old = []) =>
          old.filter((event) => event.id !== id),
        )
      }

      if (nextScope) {
        const nextScopeKey = getEventScopeQueryKey(nextScope)
        snapshots.push({
          key: nextScopeKey,
          data: queryClient.getQueryData<Event[]>(nextScopeKey),
        })

        if (nextScope.kind === "month") {
          queryClient.setQueryData<Event[]>(nextScopeKey, (old = []) => {
            const withoutExisting = old.filter((event) => event.id !== id)
            return sortEventsByStartDateTimeAsc([...withoutExisting, nextEvent])
          })
        } else {
          queryClient.setQueryData<Event[]>(nextScopeKey, (old = []) => {
            const withoutExisting = old.filter((event) => event.id !== id)
            return sortEventsByCreatedAtAsc([...withoutExisting, nextEvent])
          })
        }
      }

      return {
        snapshots: snapshots.reduce(mergeSnapshot, [] as SnapshotEntry[]),
        previousScope,
        nextScope,
        eventQueryKey,
        previousEventById,
      }
    },
    onError: (_err, _variables, context) => {
      for (const snapshot of context?.snapshots ?? []) {
        queryClient.setQueryData(snapshot.key, snapshot.data)
      }

      if (context?.eventQueryKey) {
        queryClient.setQueryData(context.eventQueryKey, context.previousEventById)
      }
      toast.error("Failed to update event")
    },
    onSettled: async (_updatedEvent, _err, variables, context) => {
      await queryClient.invalidateQueries({ queryKey: ["event", variables.id] })
      await queryClient.invalidateQueries({ queryKey: ["touchpoints", "incomplete"] })
      await invalidateEventsSearchQueries(queryClient)

      if (context?.previousScope || context?.nextScope) {
        await invalidateEventScopes(queryClient, [
          context.previousScope,
          context.nextScope,
        ])
        return
      }
      await invalidateAllEventScopes(queryClient)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => eventsApi.deleteEvent(id),
    onMutate: async (id) => {
      const eventQueryKey = ["event", id] as const
      await queryClient.cancelQueries({ queryKey: EVENTS_MONTH_QUERY_KEY_PREFIX })
      await queryClient.cancelQueries({ queryKey: EVENTS_UNSCHEDULED_QUERY_KEY })
      await queryClient.cancelQueries({ queryKey: EVENTS_SEARCH_QUERY_KEY_PREFIX })
      await queryClient.cancelQueries({ queryKey: eventQueryKey })

      const previousEvent =
        findCachedEventById(queryClient, id) ??
        queryClient.getQueryData<Event>(eventQueryKey) ??
        null
      const previousScope = getEventScopeFromEvent(previousEvent)
      const snapshots: SnapshotEntry[] = []
      const previousEventById = queryClient.getQueryData<Event>(eventQueryKey) ?? undefined

      if (previousScope) {
        const previousScopeKey = getEventScopeQueryKey(previousScope)
        snapshots.push({
          key: previousScopeKey,
          data: queryClient.getQueryData<Event[]>(previousScopeKey),
        })

        queryClient.setQueryData<Event[]>(previousScopeKey, (old = []) =>
          old.filter((event) => event.id !== id),
        )
      }

      queryClient.removeQueries({ queryKey: eventQueryKey, exact: true })

      return {
        snapshots,
        previousScope,
        eventQueryKey,
        previousEventById,
      }
    },
    onError: (_err, _id, context) => {
      for (const snapshot of context?.snapshots ?? []) {
        queryClient.setQueryData(snapshot.key, snapshot.data)
      }

      if (context?.eventQueryKey && context.previousEventById) {
        queryClient.setQueryData(context.eventQueryKey, context.previousEventById)
      }
      toast.error("Failed to delete event")
    },
    onSettled: async (_deleted, _err, id, context) => {
      await queryClient.invalidateQueries({ queryKey: ["event", id] })
      await queryClient.invalidateQueries({ queryKey: ["touchpoints", "incomplete"] })
      await invalidateEventsSearchQueries(queryClient)

      if (context?.previousScope) {
        await invalidateEventScopes(queryClient, [context.previousScope])
        return
      }
      await invalidateAllEventScopes(queryClient)
    },
  })

  const createEvent = async (newEvent: NewEvent): Promise<Event> => {
    return await createMutation.mutateAsync(newEvent)
  }

  const updateEvent = async ({ id, updates }: { id: string; updates: UpdateEvent }): Promise<Event> => {
    return await updateMutation.mutateAsync({ id, updates })
  }

  const deleteEvent = async (id: string): Promise<boolean> => {
    return await deleteMutation.mutateAsync(id)
  }

  const unscheduledEvents = unscheduledQuery.data ?? []
  const monthError = monthQuery.error
  const unscheduledError = unscheduledQuery.error
  const error = monthError ?? unscheduledError
  const isLoading = monthQuery.isLoading || unscheduledQuery.isLoading
  const isFetching = monthQuery.isFetching || unscheduledQuery.isFetching
  const isError = monthQuery.isError || unscheduledQuery.isError
  const isSuccess = monthQuery.isSuccess && unscheduledQuery.isSuccess

  return {
    monthEvents,
    unscheduledEvents,
    monthQuery,
    unscheduledQuery,
    error,
    isLoading,
    isFetching,
    isError,
    isSuccess,
    createEvent,
    updateEvent,
    deleteEvent,
  }
}

export type UseEventsReturn = ReturnType<typeof useEvents>
