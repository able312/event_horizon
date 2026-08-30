import { useParams } from "react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { BeverageItemType, Timeblock } from "~/definitions/database"
import type { BeverageItemWithAssignments, BeverageSectionPayload } from "~/definitions/beverage/beverage-types"
import * as beverageItemsIpc from "~/lib/ipc/beverageItems"
import { focusedTimeblockQueryKey } from "./useFocusedTimeblock"
import { useTimeblockMutations } from "./useTimeblockMutations"
import {
  appendBeverageItem,
  removeBeverageItem,
  replaceBeverageItemByTempId,
  setBeverageItemAssignments,
  updateBeverageItem as updateBeverageItemInCache,
} from "./util/optimisticBeverageSectionCache"

const EMPTY_TIMEBLOCKS: Timeblock[] = []
const EMPTY_ITEMS: BeverageItemWithAssignments[] = []

type BeverageItemUpdates = Partial<
  Pick<
    BeverageItemWithAssignments,
    "name" | "quantity" | "type" | "serviceStyle" | "includes" | "unitPriceCents"
  >
>

export function useBeverageSection() {
  const { id: eventId } = useParams()
  const queryClient = useQueryClient()

  const queryKey = ["beverageSection", eventId] as const

  const invalidateKeys = (focusedTimeblockId?: string) => {
    queryClient.invalidateQueries({ queryKey })
    queryClient.invalidateQueries({ queryKey: ["timeblocks", eventId] })
    if (focusedTimeblockId) {
      queryClient.invalidateQueries({ queryKey: focusedTimeblockQueryKey(focusedTimeblockId) })
    }
  }

  const invalidateAllFocusedBeverageTimeblocks = () => {
    const section = queryClient.getQueryData<BeverageSectionPayload>(queryKey)
    for (const timeblock of section?.timeblocks ?? []) {
      queryClient.invalidateQueries({ queryKey: focusedTimeblockQueryKey(timeblock.id) })
    }
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

  const addItemAssignedMutation = useMutation({
    mutationFn: ({
      id,
      type,
      timeblockId,
      newItem,
    }: {
      id?: string
      type: BeverageItemType
      timeblockId: string
      newItem?: { name?: string }
    }) =>
      beverageItemsIpc.createBeverageItemAssignedToTimeblock({
        id,
        eventId: eventId!,
        name: newItem?.name || "",
        type,
        timeblockId,
      }),
    onMutate: async ({ id, type, timeblockId, newItem }) => {
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
        assignedTimeblockIds: [timeblockId],
      }

      queryClient.setQueryData<BeverageSectionPayload>(queryKey, (old) =>
        appendBeverageItem(old, optimisticItem),
      )

      return { previousData, tempId, timeblockId }
    },
    onSuccess: (createdItem, _variables, context) => {
      if (!context) return

      queryClient.setQueryData<BeverageSectionPayload>(queryKey, (old) =>
        replaceBeverageItemByTempId(old, context.tempId, createdItem),
      )
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData)
      }
      toast.error("Failed to create beverage item")
      console.error("Failed to create assigned beverage item: ", _err.message)
    },
    onSettled: (_data, _error, variables) => {
      invalidateKeys(variables.timeblockId)
    },
  })

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, updates }: { itemId: string; updates: BeverageItemUpdates }) =>
      beverageItemsIpc.updateBeverageItem(itemId, {
        name: updates.name,
        quantity: updates.quantity,
        type: updates.type,
        serviceStyle: updates.serviceStyle,
        includes: updates.includes,
        unitPriceCents: updates.unitPriceCents,
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
      invalidateAllFocusedBeverageTimeblocks()
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
      invalidateAllFocusedBeverageTimeblocks()
    },
  })

  const setItemTimeblocksMutation = useMutation({
    mutationFn: ({ itemId, timeblockIds }: { itemId: string; timeblockIds: string[] }) =>
      beverageItemsIpc.setBeverageItemTimeblocks(itemId, timeblockIds),
    onMutate: async ({ itemId, timeblockIds }) => {
      await queryClient.cancelQueries({ queryKey })
      const previousData = queryClient.getQueryData<BeverageSectionPayload>(queryKey)
      const previousIds = previousData?.items.find((item) => item.id === itemId)?.assignedTimeblockIds ?? []

      queryClient.setQueryData<BeverageSectionPayload>(queryKey, (old) =>
        setBeverageItemAssignments(old, itemId, timeblockIds),
      )

      return { previousData, affectedTimeblockIds: [...new Set([...previousIds, ...timeblockIds])] }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData)
      }
      toast.error("Failed to update timeblock assignments")
      console.error("Failed to update timeblock assignments: ", _err.message)
    },
    onSettled: (_data, _error, _variables, context) => {
      invalidateKeys()
      for (const timeblockId of context?.affectedTimeblockIds ?? []) {
        queryClient.invalidateQueries({ queryKey: focusedTimeblockQueryKey(timeblockId) })
      }
    },
  })

  const section = query.data
  const isMutating =
    addItemMutation.isPending ||
    addItemAssignedMutation.isPending ||
    updateItemMutation.isPending ||
    deleteItemMutation.isPending ||
    setItemTimeblocksMutation.isPending

  return {
    ...query,
    timeblocks: section?.timeblocks ?? EMPTY_TIMEBLOCKS,
    items: section?.items ?? EMPTY_ITEMS,
    addTimeblock,
    updateTimeblock,
    removeTimeblock,
    addItem: addItemMutation.mutate,
    addItemAssignedToTimeblock: addItemAssignedMutation.mutate,
    updateItem: updateItemMutation.mutate,
    removeItem: deleteItemMutation.mutate,
    setItemTimeblocks: setItemTimeblocksMutation.mutate,
    isMutating,
  }
}
