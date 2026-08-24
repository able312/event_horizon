import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { UpdateTimeblock } from "~/definitions/database"
import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import type { TimeblockType } from "~/definitions/timeblocks/timeblocks-types"
import type { BeverageSectionPayload } from "~/definitions/beverage/beverage-types"
import type { CreateTimeblockInput, TimeblockPrefillRequest } from "~/definitions/timeblocks/timeblock-create"
import { getSectionDefaultPrefill } from "~/definitions/timeblocks/setupInstructionPrefill"
import * as timeblocksIpc from "~/lib/ipc/timeblocks"
import {
  appendBeverageTimeblock,
  removeTimeblockFromBeverageSection,
  updateBeverageTimeblock,
} from "./util/optimisticBeverageSectionCache"

interface UseTimeblockMutationsOptions {
  queryKey: readonly [string, string | undefined]
  eventId: string
  sectionType: TimeblockType
  cacheShape?: "timeblockList" | "beverageSection"
}

export interface AddTimeblockInput {
  title?: string
  time?: string | null
  details?: string | null
  prefill?: TimeblockPrefillRequest
}

function getBlankDetailsFallback(sectionType: TimeblockType): string | null {
  return sectionType === "note" || sectionType === "setup_instruction" ? "" : null
}

function resolveOptimisticValues(sectionType: TimeblockType, input?: AddTimeblockInput) {
  const defaultValues =
    input?.prefill?.mode === "section_default" && input.prefill.sectionType === sectionType
      ? getSectionDefaultPrefill(sectionType)
      : null

  const overrides =
    input?.prefill?.mode === "section_default" && input.prefill.sectionType === sectionType
      ? input.prefill.overrides
      : null

  return {
    title: input?.title ?? overrides?.title ?? defaultValues?.title ?? "",
    details: input?.details ?? overrides?.details ?? defaultValues?.details ?? getBlankDetailsFallback(sectionType),
    time: input?.time ?? "",
  }
}

export function useTimeblockMutations({ queryKey, eventId, sectionType, cacheShape = "timeblockList" }: UseTimeblockMutationsOptions) {
  const queryClient = useQueryClient()

  const invalidateKeys = (type: string) => {
    queryClient.invalidateQueries({ queryKey })
    queryClient.invalidateQueries({ queryKey: [type, eventId] })
    queryClient.invalidateQueries({ queryKey: ["timeblocks", eventId] })
  }

  const addTimeblockMutation = useMutation({
    mutationFn: (input?: AddTimeblockInput) => {
      const payload: CreateTimeblockInput = {
        eventId,
        sectionType,
      }

      if (input?.title !== undefined) payload.title = input.title
      if (input?.time !== undefined) payload.time = input.time
      if (input?.details !== undefined) payload.details = input.details
      if (input?.prefill !== undefined) payload.prefill = input.prefill

      return timeblocksIpc.createTimeblock(payload)
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey })
      const previousData = queryClient.getQueryData(queryKey)
      const optimisticValues = resolveOptimisticValues(sectionType, input)

      const tempId = `temp_${Date.now()}`
      const optimisticTimeblock: TimeblockWithItems = {
        id: tempId,
        title: optimisticValues.title,
        time: optimisticValues.time,
        details: optimisticValues.details,
        assignedTo: null,
        sectionType,
        eventId,
        createdAt: "",
        updatedAt: null,
      }

      if (cacheShape === "beverageSection") {
        queryClient.setQueryData<BeverageSectionPayload>(queryKey, (old) =>
          appendBeverageTimeblock(old, optimisticTimeblock),
        )
      } else {
        queryClient.setQueryData<TimeblockWithItems[]>(queryKey, (old = []) => [
          ...old,
          optimisticTimeblock,
        ])
      }

      return { previousData, tempId }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData)
      }
      toast.error("Failed to create timeblock")
    },
    onSettled: () => {
      invalidateKeys(sectionType)
    },
  })

  const updateTimeblockMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string, updates: UpdateTimeblock }) =>
      timeblocksIpc.updateTimeblock(id, updates),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey })
      const previousData = queryClient.getQueryData(queryKey)

      if (cacheShape === "beverageSection") {
        queryClient.setQueryData<BeverageSectionPayload>(queryKey, (old) =>
          updateBeverageTimeblock(old, id, updates),
        )
      } else {
        queryClient.setQueryData<TimeblockWithItems[]>(queryKey, (old = []) =>
          old.map(tb =>
            tb.id === id ? { ...tb, ...updates } : tb
          )
        )
      }

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
      const previousData = queryClient.getQueryData(queryKey)

      if (cacheShape === "beverageSection") {
        queryClient.setQueryData<BeverageSectionPayload>(queryKey, (old) =>
          removeTimeblockFromBeverageSection(old, id),
        )
      } else {
        queryClient.setQueryData<TimeblockWithItems[]>(queryKey, (old = []) =>
          old.filter(tb => tb.id !== id)
        )
      }

      return { previousData }
    },
    onError: (_err, _id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData)
      }
      toast.error("Failed to delete timeblock")
    },
    onSettled: () => {
      invalidateKeys(sectionType)
    },
  })

  const addTimeblock = (input?: AddTimeblockInput) => {
    addTimeblockMutation.mutate(input)
  }

  return {
    addTimeblock,
    updateTimeblock: updateTimeblockMutation.mutate,
    removeTimeblock: deleteTimeblockMutation.mutate,
  }
}
