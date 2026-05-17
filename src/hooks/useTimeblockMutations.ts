import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { UpdateTimeblock } from "~/definitions/database"
import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import type { TimeblockType } from "~/definitions/timeblocks/timeblocks-types"
import * as timeblocksIpc from "~/lib/ipc/timeblocks"

interface UseTimeblockMutationsOptions {
  queryKey: readonly [string, string | undefined]
  eventId: string
  sectionType: TimeblockType
}

export function useTimeblockMutations({ queryKey, eventId, sectionType }: UseTimeblockMutationsOptions) {
  const queryClient = useQueryClient()

  const invalidateKeys = (type: string) => {
    queryClient.invalidateQueries({ queryKey })
    queryClient.invalidateQueries({ queryKey: [type, eventId] })
    queryClient.invalidateQueries({ queryKey: ["timeblocks", eventId] })
  }

  const addTimeblockMutation = useMutation({
    mutationFn: () =>
      timeblocksIpc.createTimeblock({
        eventId,
        title: "",
        time: "",
        sectionType,
      }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey })
      const previousData = queryClient.getQueryData<TimeblockWithItems[]>(queryKey)

      const tempId = `temp_${Date.now()}`
      const optimisticTimeblock: TimeblockWithItems = {
        id: tempId,
        title: "",
        time: "",
        assignedTo: null,
        sectionType,
        eventId,
        createdAt: "",
        updatedAt: null,
      }

      queryClient.setQueryData<TimeblockWithItems[]>(queryKey, (old = []) => [
        ...old,
        optimisticTimeblock,
      ])

      return { previousData, tempId }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData)
      }
      toast.error("Failed to create timeblock")
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  const updateTimeblockMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string, updates: UpdateTimeblock }) =>
      timeblocksIpc.updateTimeblock(id, updates),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey })
      const previousData = queryClient.getQueryData<TimeblockWithItems[]>(queryKey)

      queryClient.setQueryData<TimeblockWithItems[]>(queryKey, (old = []) =>
        old.map(tb =>
          tb.id === id ? { ...tb, ...updates } : tb
        )
      )

      return { previousData }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData)
      }
      toast.error("Failed to update timeblock")
    },
    onSettled: (data) => {
      invalidateKeys(data?.sectionType ?? "")
    },
  })

  const deleteTimeblockMutation = useMutation({
    mutationFn: (id: string) => timeblocksIpc.deleteTimeblock(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey })
      const previousData = queryClient.getQueryData<TimeblockWithItems[]>(queryKey)

      queryClient.setQueryData<TimeblockWithItems[]>(queryKey, (old = []) =>
        old.filter(tb => tb.id !== id)
      )

      return { previousData }
    },
    onError: (_err, _id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData)
      }
      toast.error("Failed to delete timeblock")
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  return {
    addTimeblock: addTimeblockMutation.mutate,
    updateTimeblock: updateTimeblockMutation.mutate,
    removeTimeblock: deleteTimeblockMutation.mutate,
  }
}
