import { useParams, useNavigate } from "react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { Event, UpdateEvent } from "~/definitions/database"
import { getEventById, updateEvent, deleteEvent } from "~/lib/ipc/ipcEventsQueries"
import {
  EVENTS_SEARCH_QUERY_KEY_PREFIX,
  findCachedEventById,
  getEventScopeFromEvent,
  getEventScopeFromStartDateTime,
  invalidateAllEventScopes,
  invalidateEventScopes,
  invalidateEventsSearchQueries,
} from "./eventsCache"

export function useEvent() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ["event", id],
    queryFn: () => getEventById(id!),
    enabled: !!id,
  })

  const updateMutation = useMutation({
    mutationFn: (updates: UpdateEvent) => updateEvent(id!, updates),
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ["event", id] })
      await queryClient.cancelQueries({ queryKey: EVENTS_SEARCH_QUERY_KEY_PREFIX })
      const previousEvent = queryClient.getQueryData<Event>(["event", id]) ??
        findCachedEventById(queryClient, id!)
      queryClient.setQueryData(["event", id], (old: unknown) => ({
        ...(old as object),
        ...updates,
      }))

      const previousScope = getEventScopeFromEvent(previousEvent)
      const nextStartDateTime =
        updates.startDateTime !== undefined
          ? updates.startDateTime
          : previousEvent?.startDateTime
      const nextScope =
        updates.startDateTime === undefined && !previousEvent
          ? null
          : getEventScopeFromStartDateTime(nextStartDateTime)

      return { previousEvent, previousScope, nextScope }
    },
    onError: (_err, _updates, context) => {
      if (context?.previousEvent) {
        queryClient.setQueryData(["event", id], context.previousEvent)
      }
      toast.error("Failed to update event")
      console.error("Failed to update event: ", _err.message)
    },
    onSettled: async (_updatedEvent, _err, _updates, context) => {
      await queryClient.invalidateQueries({ queryKey: ["event", id] })
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
    mutationFn: () => deleteEvent(id!),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: EVENTS_SEARCH_QUERY_KEY_PREFIX })
      const previousEvent = queryClient.getQueryData<Event>(["event", id]) ??
        findCachedEventById(queryClient, id!)
      const previousScope = getEventScopeFromEvent(previousEvent)

      toast.loading("Deleting event...", { id: "delete-event" })
      return { previousScope }
    },
    onSuccess: () => {
      toast.success("Event deleted", { id: "delete-event" })
      navigate("/events")
    },
    onError: (_err) => {
      toast.error("Failed to delete event", { id: "delete-event" })
      console.error("Failed to delete event: ", _err.message)
    },
    onSettled: async (_deleted, _err, _variables, context) => {
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

  const updateEventAsync = async (updates: UpdateEvent): Promise<Event> => {
    return await updateMutation.mutateAsync(updates)
  }

  const deleteEventAsync = async (): Promise<boolean> => {
    return await deleteMutation.mutateAsync()
  }

  return {
    ...query,
    updateEvent: updateEventAsync,
    deleteEvent: deleteEventAsync,
  }
}
