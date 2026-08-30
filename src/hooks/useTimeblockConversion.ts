import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import type { ConvertTimeblockInput } from "~/definitions/timeblocks/timeblock-conversion"
import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import * as timeblocksIpc from "~/lib/ipc/timeblocks"
import { focusedTimeblockQueryKey } from "./useFocusedTimeblock"

function invalidateConversionCaches(queryClient: ReturnType<typeof useQueryClient>, eventId: string, timeblockId: string) {
  queryClient.invalidateQueries({ queryKey: ["note", eventId] })
  queryClient.invalidateQueries({ queryKey: ["setupInstructions", eventId] })
  queryClient.invalidateQueries({ queryKey: ["foodSection", eventId] })
  queryClient.invalidateQueries({ queryKey: ["timeblocks", eventId] })
  queryClient.invalidateQueries({ queryKey: focusedTimeblockQueryKey(timeblockId) })
}

export function useTimeblockConversion(eventId: string | undefined) {
  const queryClient = useQueryClient()

  const inspectMutation = useMutation({
    mutationFn: timeblocksIpc.inspectTimeblockConversion,
    onError: () => {
      toast.error("Failed to check conversion impact")
    },
  })

  const convertMutation = useMutation({
    mutationFn: (input: ConvertTimeblockInput) => timeblocksIpc.convertTimeblockSectionType(input),
    onSuccess: (result) => {
      if (!eventId) return

      // Keep the focused query immediately consistent so the orchestrator
      // can switch editors without waiting on a refetch race.
      queryClient.setQueryData<TimeblockWithItems>(
        focusedTimeblockQueryKey(result.timeblock.id),
        (old) => ({
          ...(old ?? (result.timeblock as TimeblockWithItems)),
          ...result.timeblock,
          foodItems: result.timeblock.sectionType === "food" ? old?.foodItems ?? [] : [],
        }),
      )

      invalidateConversionCaches(queryClient, eventId, result.timeblock.id)
    },
    onError: () => {
      toast.error("Failed to convert timeblock")
    },
  })

  return {
    inspectConversion: inspectMutation.mutateAsync,
    convertSectionType: convertMutation.mutateAsync,
    isInspecting: inspectMutation.isPending,
    isConverting: convertMutation.isPending,
    isBusy: inspectMutation.isPending || convertMutation.isPending,
  }
}
