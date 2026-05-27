import { useParams } from "react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTimeblockMutations } from "./useTimeblockMutations"
import { toast } from "sonner"
import type { UpdateVendorItem } from "~/definitions/database"
import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import * as vendorItemsIpc from "~/lib/ipc/vendorItems"
import {
  replaceTimeblockById,
  updateNestedOneToOneById,
} from "./util/optimisticTimeblockCache"

export function useVendorSection() {
  const { id: eventId } = useParams()
  const queryClient = useQueryClient()

  const queryKey = ["vendorSection", eventId] as const

  const invalidateKeys = () => {
    queryClient.invalidateQueries({ queryKey })
    queryClient.invalidateQueries({ queryKey: ["timeblocks", eventId] })
  }

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      return await vendorItemsIpc.getVendorsByEvent(eventId!)
    },
    enabled: !!eventId,
  })

  const { removeTimeblock, updateTimeblock } = useTimeblockMutations({
    queryKey,
    eventId: eventId!,
    sectionType: "vendor",
  })

  const addVendorMutation = useMutation({
    mutationFn: () => vendorItemsIpc.createVendor(eventId!),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey })
      const previousData = queryClient.getQueryData<TimeblockWithItems[]>(queryKey)

      const tempId = `temp_${Date.now()}`
      const now = new Date().toISOString()
      const optimisticVendor: TimeblockWithItems = {
        id: tempId,
        eventId: eventId!,
        title: "",
        time: "",
        details: null,
        sectionType: "vendor",
        assignedTo: null,
        vendorItem: {
          id: tempId,
          timeblockId: tempId,
          contactName: "",
          contactPhone: "",
          contactEmail: "",
        },
        createdAt: now,
        updatedAt: null,
      }

      queryClient.setQueryData<TimeblockWithItems[]>(queryKey, (old = []) => [
        ...old,
        optimisticVendor,
      ])

      return { previousData, tempId }
    },
    onSuccess: (createdVendor, _variables, context) => {
      if (!context) return

      const serverTimeblock: TimeblockWithItems = {
        ...createdVendor.timeblock,
        vendorItem: createdVendor.vendor,
      }

      queryClient.setQueryData<TimeblockWithItems[]>(queryKey, (old = []) =>
        replaceTimeblockById(old, context.tempId, serverTimeblock)
      )
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData)
      }
      toast.error("Failed to create vendor")
    },
    onSettled: () => {
      invalidateKeys()
    },
  })

  const updateVendorMutation = useMutation({
    mutationFn: (data: { id: string, updates: UpdateVendorItem }) =>
      vendorItemsIpc.updateVendor(data.id, data.updates),
    onMutate: async (args) => {
      await queryClient.cancelQueries({ queryKey })
      const previousData = queryClient.getQueryData<TimeblockWithItems[]>(queryKey)

      queryClient.setQueryData<TimeblockWithItems[]>(queryKey, (old = []) =>
        updateNestedOneToOneById(old, "vendorItem", args.id, args.updates)
      )

      return { previousData }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData)
      }
      toast.error("Failed to update vendor")
      console.error("Error updating vendor:", _err)
    },
    onSettled: () => {
      invalidateKeys()
    },
  })

  return {
    ...query,
    addVendor: addVendorMutation.mutate,
    updateVendor: updateVendorMutation.mutate,
    removeTimeblock,
    updateTimeblock,
  }
}
