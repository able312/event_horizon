import { useParams } from "react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { CartDetails, UpdateCartDetails } from "~/definitions/database"
import * as cartDetailsApi from "~/lib/data/cartDetails"
import { cartDetailsQueries } from "~/lib/data/queries"

export function useCartDetailsSection(enabled = true) {
  const { id: eventId } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const detailsQuery = cartDetailsQueries.byEvent(eventId ?? "")
  const queryKey = detailsQuery.queryKey


  const query = useQuery({
    ...detailsQuery,
    enabled: Boolean(eventId) && enabled,
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
  })

  return {
    ...query,
    updateCartDetails: updateMutation.mutate,
  }
}
