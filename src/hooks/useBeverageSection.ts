import { useParams } from "react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { BeverageItem } from "~/definitions/database"
import * as beverageItemsIpc from "~/lib/ipc/beverageItems"
import { useTimeblockMutations } from "./useTimeblockMutations"
import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import {
  appendListItem,
  removeListItem,
  replaceListItemByTempId,
  updateListItem,
} from "./util/optimisticTimeblockCache"


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
  })

  const addItemMutation = useMutation({
    mutationFn: ({ timeblockId, newItem }: { timeblockId: string; newItem?: Partial<BeverageItem> }) =>
      beverageItemsIpc.createBeverageItem({
        timeblockId,
        name: newItem?.name || "",
        quantity: newItem?.quantity ?? undefined,
        type: newItem?.type ?? undefined,
        serviceStyle: newItem?.serviceStyle ?? undefined,
        includes: newItem?.includes ?? undefined,
        unitPriceCents: newItem?.unitPriceCents ?? undefined,
      }),
    onMutate: async ({ timeblockId, newItem }) => {
      await queryClient.cancelQueries({ queryKey })
      const previousData = queryClient.getQueryData<TimeblockWithItems[]>(queryKey)

      const tempId = `temp_${Date.now()}`
      const optimisticItem: BeverageItem = {
        id: tempId,
        name: newItem?.name || "",
        quantity: newItem?.quantity ?? null,
        type: newItem?.type ?? null,
        serviceStyle: newItem?.serviceStyle ?? null,
        includes: newItem?.includes ?? null,
        unitPriceCents: newItem?.unitPriceCents ?? null,
        timeblockId,
      }

      queryClient.setQueryData<TimeblockWithItems[]>(queryKey, (old = []) =>
        appendListItem(old, timeblockId, "beverageItems", optimisticItem)
      )

      return { previousData, tempId, timeblockId }
    },
    onSuccess: (createdItem, _variables, context) => {
      if (!context) return

      queryClient.setQueryData<TimeblockWithItems[]>(queryKey, (old = []) =>
        replaceListItemByTempId(old, context.timeblockId, "beverageItems", context.tempId, createdItem)
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
    mutationFn: ({ itemId, updates }: { timeblockId: string; itemId: string; updates: Partial<BeverageItem> }) =>
      beverageItemsIpc.updateBeverageItem(itemId, {
        name: updates.name ?? undefined,
        quantity: updates.quantity ?? undefined,
        type: updates.type ?? undefined,
        serviceStyle: updates.serviceStyle ?? undefined,
        includes: updates.includes ?? undefined,
        unitPriceCents: updates.unitPriceCents ?? undefined,
      }),
    onMutate: async ({ timeblockId, itemId, updates }) => {
      await queryClient.cancelQueries({ queryKey })
      const previousData = queryClient.getQueryData<TimeblockWithItems[]>(queryKey)

      queryClient.setQueryData<TimeblockWithItems[]>(queryKey, (old = []) =>
        updateListItem(old, timeblockId, "beverageItems", itemId, updates)
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
    mutationFn: ({ itemId }: { timeblockId: string; itemId: string }) =>
      beverageItemsIpc.deleteBeverageItem(itemId),
    onMutate: async ({ timeblockId, itemId }) => {
      await queryClient.cancelQueries({ queryKey })
      const previousData = queryClient.getQueryData<TimeblockWithItems[]>(queryKey)

      queryClient.setQueryData<TimeblockWithItems[]>(queryKey, (old = []) =>
        removeListItem(old, timeblockId, "beverageItems", itemId)
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

  return {
    ...query,
    addTimeblock,
    updateTimeblock,
    removeTimeblock,
    addItem: addItemMutation.mutate,
    updateItem: updateItemMutation.mutate,
    removeItem: deleteItemMutation.mutate,
  }
}
