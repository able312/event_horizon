import { useParams } from "react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { FoodItem } from "~/definitions/database"
import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import * as foodItemsIpc from "~/lib/ipc/foodItems"
import { focusedTimeblockQueryKey } from "./useFocusedTimeblock"
import { useTimeblockMutations } from "./useTimeblockMutations"
import {
  appendListItem,
  removeListItem,
  replaceListItemByTempId,
  updateListItem,
} from "./util/optimisticTimeblockCache"

function updateFocusedFoodItems(
  timeblock: TimeblockWithItems | undefined,
  updateItems: (items: FoodItem[]) => FoodItem[],
): TimeblockWithItems | undefined {
  if (!timeblock) return timeblock

  return {
    ...timeblock,
    foodItems: updateItems(timeblock.foodItems ?? []),
  }
}

function restoreQueryData<T>(
  queryClient: ReturnType<typeof useQueryClient>,
  queryKey: readonly unknown[],
  previousData: T | undefined,
) {
  if (previousData === undefined) {
    queryClient.removeQueries({ queryKey, exact: true })
    return
  }

  queryClient.setQueryData(queryKey, previousData)
}


export function useFoodSection() {
  const { id: eventId } = useParams()
  const queryClient = useQueryClient()

  const queryKey = ["foodSection", eventId] as const

  const invalidateKeys = (focusedTimeblockId?: string) => {
    queryClient.invalidateQueries({ queryKey })
    queryClient.invalidateQueries({ queryKey: ["timeblocks", eventId] })
    if (focusedTimeblockId) {
      queryClient.invalidateQueries({ queryKey: focusedTimeblockQueryKey(focusedTimeblockId) })
    }
  }

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      return await foodItemsIpc.getFoodSectionWithItems(eventId!)
    },
    enabled: !!eventId,
  })

  const { addTimeblock, updateTimeblock, removeTimeblock, isMutating: isTimeblockMutating } = useTimeblockMutations({
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
      const focusedQueryKey = focusedTimeblockQueryKey(timeblockId)
      await Promise.all([
        queryClient.cancelQueries({ queryKey }),
        queryClient.cancelQueries({ queryKey: focusedQueryKey }),
      ])
      const previousData = queryClient.getQueryData<TimeblockWithItems[]>(queryKey)
      const previousFocusedData = queryClient.getQueryData<TimeblockWithItems>(focusedQueryKey)

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
      queryClient.setQueryData<TimeblockWithItems>(focusedQueryKey, (old) =>
        updateFocusedFoodItems(old, (items) => [...items, optimisticItem]),
      )

      return { previousData, previousFocusedData, tempId, timeblockId }
    },
    onSuccess: (createdItem, _variables, context) => {
      if (!context) return

      queryClient.setQueryData<TimeblockWithItems[]>(queryKey, (old = []) =>
        replaceListItemByTempId(old, context.timeblockId, "foodItems", context.tempId, createdItem)
      )
      queryClient.setQueryData<TimeblockWithItems>(
        focusedTimeblockQueryKey(context.timeblockId),
        (old) => updateFocusedFoodItems(
          old,
          (items) => items.map((item) => item.id === context.tempId ? createdItem : item),
        ),
      )
    },
    onError: (_err, variables, context) => {
      if (context) {
        restoreQueryData(queryClient, queryKey, context.previousData)
        restoreQueryData(
          queryClient,
          focusedTimeblockQueryKey(variables.timeblockId),
          context.previousFocusedData,
        )
      }
      toast.error("Failed to create food item")
    },
    onSettled: (_data, _error, variables) => {
      invalidateKeys(variables.timeblockId)
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
      const focusedQueryKey = focusedTimeblockQueryKey(timeblockId)
      await Promise.all([
        queryClient.cancelQueries({ queryKey }),
        queryClient.cancelQueries({ queryKey: focusedQueryKey }),
      ])
      const previousData = queryClient.getQueryData<TimeblockWithItems[]>(queryKey)
      const previousFocusedData = queryClient.getQueryData<TimeblockWithItems>(focusedQueryKey)

      queryClient.setQueryData<TimeblockWithItems[]>(queryKey, (old = []) =>
        updateListItem(old, timeblockId, "foodItems", itemId, updates)
      )
      queryClient.setQueryData<TimeblockWithItems>(focusedQueryKey, (old) =>
        updateFocusedFoodItems(old, (items) => items.map((item) =>
          item.id === itemId ? { ...item, ...updates } : item,
        )),
      )

      return { previousData, previousFocusedData }
    },
    onSuccess: (updatedItem, variables) => {
      queryClient.setQueryData<TimeblockWithItems[]>(queryKey, (old = []) =>
        updateListItem(old, variables.timeblockId, "foodItems", updatedItem.id, updatedItem),
      )
      queryClient.setQueryData<TimeblockWithItems>(
        focusedTimeblockQueryKey(variables.timeblockId),
        (old) => updateFocusedFoodItems(
          old,
          (items) => items.map((item) => item.id === updatedItem.id ? updatedItem : item),
        ),
      )
    },
    onError: (_err, variables, context) => {
      if (context) {
        restoreQueryData(queryClient, queryKey, context.previousData)
        restoreQueryData(
          queryClient,
          focusedTimeblockQueryKey(variables.timeblockId),
          context.previousFocusedData,
        )
      }
      toast.error("Failed to update food item")
    },
    onSettled: (_data, _error, variables) => {
      invalidateKeys(variables.timeblockId)
    },
  })

  const deleteItemMutation = useMutation({
    mutationFn: async ({ itemId }: { timeblockId: string; itemId: string }) => {
      const deleted = await foodItemsIpc.deleteFoodItem(itemId)
      if (!deleted) {
        throw new Error(`Food item not found for id ${itemId}`)
      }
      return deleted
    },
    onMutate: async ({ timeblockId, itemId }) => {
      const focusedQueryKey = focusedTimeblockQueryKey(timeblockId)
      await Promise.all([
        queryClient.cancelQueries({ queryKey }),
        queryClient.cancelQueries({ queryKey: focusedQueryKey }),
      ])
      const previousData = queryClient.getQueryData<TimeblockWithItems[]>(queryKey)
      const previousFocusedData = queryClient.getQueryData<TimeblockWithItems>(focusedQueryKey)

      queryClient.setQueryData<TimeblockWithItems[]>(queryKey, (old = []) =>
        removeListItem(old, timeblockId, "foodItems", itemId)
      )
      queryClient.setQueryData<TimeblockWithItems>(focusedQueryKey, (old) =>
        updateFocusedFoodItems(old, (items) => items.filter((item) => item.id !== itemId)),
      )

      return { previousData, previousFocusedData }
    },
    onError: (_err, variables, context) => {
      if (context) {
        restoreQueryData(queryClient, queryKey, context.previousData)
        restoreQueryData(
          queryClient,
          focusedTimeblockQueryKey(variables.timeblockId),
          context.previousFocusedData,
        )
      }
      toast.error("Failed to delete food item")
    },
    onSettled: (_data, _error, variables) => {
      invalidateKeys(variables.timeblockId)
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
    isMutating:
      isTimeblockMutating ||
      addItemMutation.isPending ||
      updateItemMutation.isPending ||
      deleteItemMutation.isPending,
    isUpdatingItem: updateItemMutation.isPending,
    isAddingItem: addItemMutation.isPending,
    isRemovingItem: deleteItemMutation.isPending,
  }
}
