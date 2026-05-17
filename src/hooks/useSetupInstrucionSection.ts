import { useParams } from "react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTimeblockMutations } from "./useTimeblockMutations"
import { toast } from "sonner"
import type { UpdateSetupInstruction } from "~/definitions/database"
import * as SetupInstructionsIpc from "~/lib/ipc/setupInstructions"
import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import {
  replaceTimeblockById,
  updateNestedOneToOneById,
} from "./util/optimisticTimeblockCache"


export function useSetupInstructionSection() {
  const { id: eventId } = useParams()
  const queryClient = useQueryClient()

  const queryKey = ["setupInstructions", eventId] as const

  const invalidateKeys = () => {
    queryClient.invalidateQueries({ queryKey })
    queryClient.invalidateQueries({ queryKey: ["timeblocks", eventId] })
  }

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      return await SetupInstructionsIpc.getSetupInstructionsByEvent(eventId!)
    },
    enabled: !!eventId,
  })

  const { removeTimeblock, updateTimeblock } = useTimeblockMutations({
    queryKey,
    eventId: eventId!,
    sectionType: "setup_instruction",
  })

  const addSetupInstructionMutation = useMutation({
    mutationFn: () => SetupInstructionsIpc.createSetupInstruction(eventId!),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey })
      const previousData = queryClient.getQueryData<TimeblockWithItems[]>(queryKey)

      const tempId = `temp_${Date.now()}`
      const now = new Date().toISOString()
      const optimisticSetupInstruction: TimeblockWithItems = {
        id: tempId,
        eventId: eventId!,
        assignedTo: null,
        title: "",
        time: "",
        sectionType: "setup_instruction",
        setupInstruction:{
          id: tempId,
          timeblockId: tempId,
          instruction: "",
          createdAt: now,
          updatedAt: now,
        },
        createdAt: now,
        updatedAt: null,
      }

      queryClient.setQueryData<TimeblockWithItems[]>(queryKey, (old = []) => [
        ...old,
        optimisticSetupInstruction,
      ])

      return { previousData, tempId }
    },
    onSuccess: (createdSetupInstruction, _variables, context) => {
      if (!context) return

      const serverTimeblock: TimeblockWithItems = {
        ...createdSetupInstruction.timeblock,
        setupInstruction: createdSetupInstruction.setupInstruction,
      }

      queryClient.setQueryData<TimeblockWithItems[]>(queryKey, (old = []) =>
        replaceTimeblockById(old, context.tempId, serverTimeblock)
      )
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData)
      }
      toast.error("Failed to create setup instruction")
      console.error("Error creating setup instruction:", _err)
    },
    onSettled: () => {
      invalidateKeys()
    },
  })

  const updateSetupInstructionMutation = useMutation({
    mutationFn: (data: { id: string, updates: UpdateSetupInstruction }) =>
      SetupInstructionsIpc.updateSetupInstruction(data.id, data.updates),
    onMutate: async (args) => {
      await queryClient.cancelQueries({ queryKey })
      const previousData = queryClient.getQueryData<TimeblockWithItems[]>(queryKey)

      queryClient.setQueryData<TimeblockWithItems[]>(queryKey, (old = []) =>
        updateNestedOneToOneById(old, "setupInstruction", args.id, args.updates)
      )

      return { previousData }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData)
      }
      toast.error("Failed to update setup instruction")
      console.error("Error updating setup instruction:", _err)
    },
    onSettled: () => {
      invalidateKeys()
    },
  })

  return {
    ...query,
    addSetupInstruction: addSetupInstructionMutation.mutate,
    updateSetupInstruction: updateSetupInstructionMutation.mutate,
    removeTimeblock,
    updateTimeblock,
  }
}
