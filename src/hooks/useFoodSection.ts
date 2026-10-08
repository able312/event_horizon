import { useParams } from "react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { FoodItem } from "~/definitions/database"
import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import * as foodItemsIpc from "~/lib/data/foodItems"
import { timeblockKeys, timeblockQueries } from "~/lib/data/queries"
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
  // Only restore when we had a snapshot. Avoid removeQueries on active observers.
  if (previousData === undefined) return
  queryClient.setQueryData(queryKey, previousData)
}

function pickConfirmedUpdates(
  updatedItem: FoodItem,
  updates: Partial<FoodItem>,
): Partial<FoodItem> {
  return (Object.keys(updates) as (keyof FoodItem)[]).reduce<Partial<FoodItem>>(
    (confirmed, key) => {
      if (!(key in updatedItem)) return confirmed
      return { ...confirmed, [key]: updatedItem[key] }
    },
    {},
  )
}


export function useFoodSection() {
  const { id: eventId } = useParams()
  const queryClient = useQueryClient()

  const sectionQuery = timeblockQueries.foodSection(eventId ?? "")
  const queryKey = sectionQuery.queryKey

  const invalidateKeys = (focusedTimeblockId?: string) => {
    queryClient.invalidateQueries({ queryKey })
    queryClient.invalidateQueries({ queryKey: timeblockKeys.timeline(eventId ?? "") })
    if (focusedTimeblockId) {
      queryClient.invalidateQueries({ queryKey: timeblockKeys.byId(focusedTimeblockId) })
    }
  }

  const query = useQuery({
    ...sectionQuery,
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
      const focusedQueryKey = timeblockKeys.byId(timeblockId)
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
        timeblockKeys.byId(context.timeblockId),
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
          timeblockKeys.byId(variables.timeblockId),
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
      const focusedQueryKey = timeblockKeys.byId(timeblockId)
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
      // Merge only fields this mutation sent so an in-flight sibling update
      // (e.g. name then quantity) is not overwritten by a stale server row.
      const confirmedUpdates = pickConfirmedUpdates(updatedItem, variables.updates)

      queryClient.setQueryData<TimeblockWithItems[]>(queryKey, (old = []) =>
        updateListItem(old, variables.timeblockId, "foodItems", updatedItem.id, confirmedUpdates),
      )
      queryClient.setQueryData<TimeblockWithItems>(
        timeblockKeys.byId(variables.timeblockId),
        (old) => updateFocusedFoodItems(
          old,
          (items) => items.map((item) =>
            item.id === updatedItem.id ? { ...item, ...confirmedUpdates } : item,
          ),
        ),
      )
    },
    onError: (_err, variables, context) => {
      if (context) {
        restoreQueryData(queryClient, queryKey, context.previousData)
        restoreQueryData(
          queryClient,
          timeblockKeys.byId(variables.timeblockId),
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
    mutationFn: ({ itemId }: { timeblockId: string; itemId: string }) =>
      foodItemsIpc.deleteFoodItem(itemId),
    onMutate: async ({ timeblockId, itemId }) => {
      const focusedQueryKey = timeblockKeys.byId(timeblockId)
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
          timeblockKeys.byId(variables.timeblockId),
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
