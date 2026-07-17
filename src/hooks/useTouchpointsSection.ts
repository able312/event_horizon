import { useParams } from "react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import type { NewTouchpoint, Touchpoint, UpdateTouchpoint } from "~/definitions/database"
import * as touchpointApi from "~/lib/ipc/touchpoints"

function sortTouchpoints(items: Touchpoint[]): Touchpoint[] {
  return [...items].sort((a, b) => {
    const aDone = a.completedAt ? 1 : 0
    const bDone = b.completedAt ? 1 : 0
    if (aDone !== bDone) return aDone - bDone

    const dateCompare = (a.dueDate ?? "").localeCompare(b.dueDate ?? "")
    if (dateCompare !== 0) return dateCompare

    return (a.createdAt ?? "").localeCompare(b.createdAt ?? "")
  })
}

export function useTouchpointsSection(eventIdOverride?: string) {
  const { id: routeEventId } = useParams<{ id: string }>()
  const eventId = eventIdOverride ?? routeEventId
  const queryClient = useQueryClient()

  const queryKey = ["touchpoints", eventId] as const
  const incompleteQueryKey = ["touchpoints", "incomplete"] as const

  const query = useQuery({
    queryKey,
    enabled: Boolean(eventId),
    queryFn: async () => {
      const data = await touchpointApi.getTouchpointsByEventId(eventId!)
      return sortTouchpoints(data)
    },
  })

  const invalidateRelated = () => {
    void queryClient.invalidateQueries({ queryKey })
    void queryClient.invalidateQueries({ queryKey: incompleteQueryKey })
  }

  const createMutation = useMutation({
    mutationFn: (values?: Partial<Pick<NewTouchpoint, "title" | "dueDate" | "completedAt">>) =>
      touchpointApi.createTouchpoint(eventId!, values),
    onError: () => {
      toast.error("Failed to create touchpoint")
    },
    onSettled: () => {
      invalidateRelated()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateTouchpoint }) =>
      touchpointApi.updateTouchpoint(id, updates),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Touchpoint[]>(queryKey)

      queryClient.setQueryData<Touchpoint[]>(queryKey, (old = []) =>
        sortTouchpoints(old.map((row) => (row.id === id ? { ...row, ...updates } : row))),
      )

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      }
      toast.error("Failed to update touchpoint")
    },
    onSettled: () => {
      invalidateRelated()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => touchpointApi.deleteTouchpoint(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Touchpoint[]>(queryKey)

      queryClient.setQueryData<Touchpoint[]>(queryKey, (old = []) =>
        sortTouchpoints(old.filter((row) => row.id !== id)),
      )

      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      }
      toast.error("Failed to delete touchpoint")
    },
    onSettled: () => {
      invalidateRelated()
    },
  })

  const seedMutation = useMutation({
    mutationFn: () => touchpointApi.seedCommonTouchpoints(eventId!),
    onError: () => {
      toast.error("Failed to seed common touchpoints")
    },
    onSuccess: () => {
      toast.success("Added common touchpoints")
    },
    onSettled: () => {
      invalidateRelated()
    },
  })

  return {
    ...query,
    createTouchpoint: createMutation.mutate,
    createTouchpointAsync: createMutation.mutateAsync,
    updateTouchpoint: updateMutation.mutate,
    updateTouchpointAsync: updateMutation.mutateAsync,
    deleteTouchpoint: deleteMutation.mutate,
    deleteTouchpointAsync: deleteMutation.mutateAsync,
    seedCommonTouchpoints: seedMutation.mutate,
    seedCommonTouchpointsAsync: seedMutation.mutateAsync,
  }
}

export function useIncompleteTouchpoints() {
  return useQuery({
    queryKey: ["touchpoints", "incomplete"] as const,
    queryFn: () => touchpointApi.getIncompleteTouchpoints(),
  })
}
