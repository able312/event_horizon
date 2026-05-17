import { useParams } from "react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { FoodItem } from "~/definitions/database"
import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import * as foodItemsIpc from "~/lib/ipc/foodItems"
import { useTimeblockMutations } from "./useTimeblockMutations"
import {
  appendListItem,
  removeListItem,
  replaceListItemByTempId,
  updateListItem,
} from "./util/optimisticTimeblockCache"


export function useFoodSection() {
  const { id: eventId } = useParams()
  const queryClient = useQueryClient()

  const queryKey = ["foodSection", eventId] as const

  const invalidateKeys = () => {
    queryClient.invalidateQueries({ queryKey })
    queryClient.invalidateQueries({ queryKey: ["timeblocks", eventId] })
  }

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      return await foodItemsIpc.getFoodSectionWithItems(eventId!)
    },
    enabled: !!eventId,
  })

  const { addTimeblock, updateTimeblock, removeTimeblock } = useTimeblockMutations({
    queryKey,
    eventId: eventId!,
    sectionType: "food",
  })

  const addItemMutation = useMutation({
    mutationFn: ({ timeblockId, newItem }: { timeblockId: string; newItem?: Partial<FoodItem> }) =>
      foodItemsIpc.createFoodItem({
        timeblockId,
        name: newItem?.name || "",
        quantity: newItem?.quantity ?? undefined,
        serviceStyle: newItem?.serviceStyle ?? undefined,
        includes: newItem?.includes ?? undefined,
        unitPriceCents: newItem?.unitPriceCents ?? undefined,
      }),
    onMutate: async ({ timeblockId, newItem }) => {
      await queryClient.cancelQueries({ queryKey })
      const previousData = queryClient.getQueryData<TimeblockWithItems[]>(queryKey)

      const tempId = `temp_${Date.now()}`
      const optimisticItem: FoodItem = {
        id: tempId,
        name: newItem?.name || "",
        quantity: newItem?.quantity ?? null,
        serviceStyle: newItem?.serviceStyle ?? null,
        includes: newItem?.includes ?? null,
        unitPriceCents: newItem?.unitPriceCents ?? null,
        timeblockId,
      }

      queryClient.setQueryData<TimeblockWithItems[]>(queryKey, (old = []) =>
        appendListItem(old, timeblockId, "foodItems", optimisticItem)
      )

      return { previousData, tempId, timeblockId }
    },
    onSuccess: (createdItem, _variables, context) => {
      if (!context) return

      queryClient.setQueryData<TimeblockWithItems[]>(queryKey, (old = []) =>
        replaceListItemByTempId(old, context.timeblockId, "foodItems", context.tempId, createdItem)
      )
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData)
      }
      toast.error("Failed to create food item")
    },
    onSettled: () => {
      invalidateKeys()
    },
  })

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, updates }: { timeblockId: string; itemId: string; updates: Partial<FoodItem> }) =>
      foodItemsIpc.updateFoodItem(itemId, {
        name: updates.name ?? undefined,
        quantity: updates.quantity ?? undefined,
        serviceStyle: updates.serviceStyle ?? undefined,
        includes: updates.includes ?? undefined,
        unitPriceCents: updates.unitPriceCents ?? undefined,
      }),
    onMutate: async ({ timeblockId, itemId, updates }) => {
      await queryClient.cancelQueries({ queryKey })
      const previousData = queryClient.getQueryData<TimeblockWithItems[]>(queryKey)

      queryClient.setQueryData<TimeblockWithItems[]>(queryKey, (old = []) =>
        updateListItem(old, timeblockId, "foodItems", itemId, updates)
      )

      return { previousData }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData)
      }
      toast.error("Failed to update food item")
    },
    onSettled: () => {
      invalidateKeys()
    },
  })

  const deleteItemMutation = useMutation({
    mutationFn: ({ itemId }: { timeblockId: string; itemId: string }) =>
      foodItemsIpc.deleteFoodItem(itemId),
    onMutate: async ({ timeblockId, itemId }) => {
      await queryClient.cancelQueries({ queryKey })
      const previousData = queryClient.getQueryData<TimeblockWithItems[]>(queryKey)

      queryClient.setQueryData<TimeblockWithItems[]>(queryKey, (old = []) =>
        removeListItem(old, timeblockId, "foodItems", itemId)
      )

      return { previousData }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData)
      }
      toast.error("Failed to delete food item")
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
