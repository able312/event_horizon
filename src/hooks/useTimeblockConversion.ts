import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import type { ConvertTimeblockInput } from "~/definitions/timeblocks/timeblock-conversion"
import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import { timeblockKeys } from "~/lib/data/queries"
import * as timeblocksIpc from "~/lib/data/timeblocks"

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
      // can switch editors before the live update arrives.
      queryClient.setQueryData<TimeblockWithItems>(
        timeblockKeys.byId(result.timeblock.id),
        (old) => ({
          ...(old ?? (result.timeblock as TimeblockWithItems)),
          ...result.timeblock,
          foodItems: result.timeblock.sectionType === "food" ? old?.foodItems ?? [] : [],
          beverageItems: result.timeblock.sectionType === "beverage" ? old?.beverageItems ?? [] : [],
        }),
      )

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
