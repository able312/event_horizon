import { useParams, useNavigate } from "react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { Event, UpdateEvent } from "~/definitions/database"
import { updateEvent, deleteEvent } from "~/lib/data/events"
import { eventKeys, eventQueries } from "~/lib/data/queries"
import { findCachedEventById } from "./eventsCache"

export function useEvent() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const eventQueryKey = eventKeys.byId(id ?? "")

  const query = useQuery({
    ...eventQueries.byId(id ?? ""),
    enabled: !!id,
  })

  const updateMutation = useMutation({
    mutationFn: (updates: UpdateEvent) => updateEvent(id!, updates),
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: eventQueryKey })
      await queryClient.cancelQueries({ queryKey: eventKeys.searches() })
      const previousEvent = queryClient.getQueryData<Event>(eventQueryKey) ??
        findCachedEventById(queryClient, id!)
      queryClient.setQueryData(eventQueryKey, (old: unknown) => ({
        ...(old as object),
        ...updates,
      }))

      return { previousEvent }
    },
    onError: (_err, _updates, context) => {
      if (context?.previousEvent) {
        queryClient.setQueryData(eventQueryKey, context.previousEvent)
      }
      toast.error("Failed to update event")
      console.error("Failed to update event: ", _err.message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteEvent(id!),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: eventKeys.searches() })
      toast.loading("Deleting event...", { id: "delete-event" })
    },
    onSuccess: () => {
      toast.success("Event deleted", { id: "delete-event" })
      navigate("/events")
    },
    onError: (_err) => {
      toast.error("Failed to delete event", { id: "delete-event" })
      console.error("Failed to delete event: ", _err.message)
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
