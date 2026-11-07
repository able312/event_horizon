import { useParams } from "react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { EstimateDetails, UpdateEstimateDetails } from "~/definitions/database"
import * as estimateDetailsApi from "~/lib/data/estimateDetails"
import { estimateDetailsQueries } from "~/lib/data/queries"

/** The current event's estimate details (created on first read), with an optimistic update. */
export function useEstimateDetailsSection(enabled = true) {
  const { id: eventId } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const detailsQuery = estimateDetailsQueries.byEvent(eventId ?? "")
  const queryKey = detailsQuery.queryKey

  const query = useQuery({
    ...detailsQuery,
    enabled: Boolean(eventId) && enabled,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateEstimateDetails }) =>
      estimateDetailsApi.updateEstimateDetails(id, updates),
    onMutate: async ({ updates }) => {
      await queryClient.cancelQueries({ queryKey })
      const previousEstimateDetails = queryClient.getQueryData<EstimateDetails>(queryKey)

      queryClient.setQueryData<EstimateDetails>(queryKey, (old) =>
        old ? { ...old, ...updates } : old
      )

      return { previousEstimateDetails }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousEstimateDetails) {
        queryClient.setQueryData(queryKey, context.previousEstimateDetails)
      }
      toast.error("Failed to update estimate details")
      console.error("Error updating estimate details:", _err)
    },
  })

  return {
    ...query,
    updateEstimateDetails: updateMutation.mutate,
  }
}
