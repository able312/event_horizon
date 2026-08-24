import { useParams } from "react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { BeverageItemType } from "~/definitions/database"
import type { BeverageItemWithAssignments, BeverageSectionPayload } from "~/definitions/beverage/beverage-types"
import * as beverageItemsIpc from "~/lib/ipc/beverageItems"
import { useTimeblockMutations } from "./useTimeblockMutations"
import {
  appendBeverageItem,
  removeBeverageItem,
  replaceBeverageItemByTempId,
  setBeverageItemAssignments,
  updateBeverageItem as updateBeverageItemInCache,
} from "./util/optimisticBeverageSectionCache"

export function useBeverageSection() {
  const { id: eventId } = useParams()
  const queryClient = useQueryClient()

  const queryKey = ["beverageSection", eventId] as const

  const invalidateKeys = () => {
    queryClient.invalidateQueries({ queryKey })
    queryClient.invalidateQueries({ queryKey: ["timeblocks", eventId] })
  }

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      return await beverageItemsIpc.getBeverageSectionWithItems(eventId!)
    },
    enabled: !!eventId,
  })

  const { addTimeblock, updateTimeblock, removeTimeblock } = useTimeblockMutations({
    queryKey,
    eventId: eventId!,
    sectionType: "beverage",
    cacheShape: "beverageSection",
  })

  const addItemMutation = useMutation({
    mutationFn: ({ id, type, newItem }: { id?: string; type: BeverageItemType; newItem?: { name?: string } }) =>
      beverageItemsIpc.createBeverageItem({
        id,
        eventId: eventId!,
        name: newItem?.name || "",
        type,
      }),
    onMutate: async ({ id, type, newItem }) => {
      await queryClient.cancelQueries({ queryKey })
      const previousData = queryClient.getQueryData<BeverageSectionPayload>(queryKey)

      const tempId = id ?? `temp_${Date.now()}`
      const optimisticItem: BeverageItemWithAssignments = {
        id: tempId,
        eventId: eventId!,
        name: newItem?.name || "",
        quantity: null,
        type,
        serviceStyle: null,
        includes: null,
        unitPriceCents: null,
        assignedTimeblockIds: [],
      }

      queryClient.setQueryData<BeverageSectionPayload>(queryKey, (old) =>
        appendBeverageItem(old, optimisticItem),
      )

      return { previousData, tempId }
    },
    onSuccess: (createdItem, _variables, context) => {
      if (!context) return

      const withAssignments: BeverageItemWithAssignments = {
        ...createdItem,
        assignedTimeblockIds: [],
      }

      queryClient.setQueryData<BeverageSectionPayload>(queryKey, (old) =>
        replaceBeverageItemByTempId(old, context.tempId, withAssignments),
      )
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData)
      }
      toast.error("Failed to create beverage item")
      console.error("Failed to create beverage item: ", _err.message)
    },
    onSettled: () => {
      invalidateKeys()
    },
  })

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, updates }: { itemId: string; updates: Partial<BeverageItemWithAssignments> }) =>
      beverageItemsIpc.updateBeverageItem(itemId, {
        name: updates.name ?? undefined,
        quantity: updates.quantity ?? undefined,
        type: updates.type ?? undefined,
        unitPriceCents: updates.unitPriceCents ?? undefined,
      }),
    onMutate: async ({ itemId, updates }) => {
      await queryClient.cancelQueries({ queryKey })
      const previousData = queryClient.getQueryData<BeverageSectionPayload>(queryKey)

      queryClient.setQueryData<BeverageSectionPayload>(queryKey, (old) =>
        updateBeverageItemInCache(old, itemId, updates),
      )

      return { previousData }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData)
      }
      toast.error("Failed to update beverage item")
      console.error("Failed to update beverage item: ", _err.message)
    },
    onSettled: () => {
      invalidateKeys()
    },
  })

  const deleteItemMutation = useMutation({
    mutationFn: ({ itemId }: { itemId: string }) =>
      beverageItemsIpc.deleteBeverageItem(itemId),
    onMutate: async ({ itemId }) => {
      await queryClient.cancelQueries({ queryKey })
      const previousData = queryClient.getQueryData<BeverageSectionPayload>(queryKey)

      queryClient.setQueryData<BeverageSectionPayload>(queryKey, (old) =>
        removeBeverageItem(old, itemId),
      )

      return { previousData }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData)
      }
      toast.error("Failed to delete beverage item")
      console.error("Failed to delete beverage item: ", _err.message)
    },
    onSettled: () => {
      invalidateKeys()
    },
  })

  const setItemTimeblocksMutation = useMutation({
    mutationFn: ({ itemId, timeblockIds }: { itemId: string; timeblockIds: string[] }) =>
      beverageItemsIpc.setBeverageItemTimeblocks(itemId, timeblockIds),
    onMutate: async ({ itemId, timeblockIds }) => {
      await queryClient.cancelQueries({ queryKey })
      const previousData = queryClient.getQueryData<BeverageSectionPayload>(queryKey)

      queryClient.setQueryData<BeverageSectionPayload>(queryKey, (old) =>
        setBeverageItemAssignments(old, itemId, timeblockIds),
      )

      return { previousData }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData)
      }
      toast.error("Failed to update timeblock assignments")
      console.error("Failed to update timeblock assignments: ", _err.message)
    },
    onSettled: () => {
      invalidateKeys()
    },
  })

  const section = query.data

  return {
    ...query,
    timeblocks: section?.timeblocks ?? [],
    items: section?.items ?? [],
    addTimeblock,
    updateTimeblock,
    removeTimeblock,
    addItem: addItemMutation.mutate,
    updateItem: updateItemMutation.mutate,
    removeItem: deleteItemMutation.mutate,
    setItemTimeblocks: setItemTimeblocksMutation.mutate,
  }
}
