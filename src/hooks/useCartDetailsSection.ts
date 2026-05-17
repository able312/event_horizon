import { useParams } from "react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { CartDetails, UpdateCartDetails } from "~/definitions/database"
import * as cartDetailsApi from "~/lib/ipc/cartDetails"

export function useCartDetailsSection() {
  const { id: eventId } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const queryKey = ["cart_details", eventId] as const

  const invalidateKeys = () => {
    queryClient.invalidateQueries({ queryKey })
    queryClient.invalidateQueries({ queryKey: ["timeblocks", eventId] })
  }

  const query = useQuery({
    queryKey,
    queryFn: () => cartDetailsApi.getOrCreateCartDetailsByEventId(eventId!),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateCartDetails }) =>
      cartDetailsApi.updateCartDetails(id, updates),
    onMutate: async ({ updates }) => {
      await queryClient.cancelQueries({ queryKey })
      const previousCartDetails = queryClient.getQueryData<CartDetails>(queryKey)

      queryClient.setQueryData<CartDetails>(queryKey, (old) =>
        old ? { ...old, ...updates } : old
      )

      return { previousCartDetails }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousCartDetails) {
        queryClient.setQueryData(queryKey, context.previousCartDetails)
      }
      toast.error("Failed to update cart details")
      console.error("Error updating cart details:", _err)
    },
    onSettled: () => {
      invalidateKeys()
    },
  })

  return {
    ...query,
    updateCartDetails: updateMutation.mutate,
  }
}
