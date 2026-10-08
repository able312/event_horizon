import { useParams } from "react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { TournamentDetails, UpdateTournamentDetails } from "~/definitions/database"
import * as tournamentDetailsApi from "~/lib/data/tournamentDetails"
import { tournamentDetailsQueries, timeblockKeys } from "~/lib/data/queries"

export function useTournamentDetailsSection(enabled = true) {
  const { id: eventId } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const detailsQuery = tournamentDetailsQueries.byEvent(eventId ?? "")
  const queryKey = detailsQuery.queryKey

  const invalidateKeys = () => {
    queryClient.invalidateQueries({ queryKey })
    queryClient.invalidateQueries({ queryKey: timeblockKeys.timeline(eventId ?? "") })
  }

  const query = useQuery({
    ...detailsQuery,
    enabled: Boolean(eventId) && enabled,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateTournamentDetails }) =>
      tournamentDetailsApi.updateTournamentDetails(id, updates),
    onMutate: async ({ updates }) => {
      await queryClient.cancelQueries({ queryKey })
      const previousTournamentDetails = queryClient.getQueryData<TournamentDetails>(queryKey)

      queryClient.setQueryData<TournamentDetails>(queryKey, (old) =>
        old ? { ...old, ...updates } : old
      )

      return { previousTournamentDetails }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTournamentDetails) {
        queryClient.setQueryData(queryKey, context.previousTournamentDetails)
      }
      toast.error("Failed to update tournament details")
      console.error("Error updating tournament details:", _err)
    },
    onSettled: () => {
      invalidateKeys()
    },
  })

  return {
    ...query,
    updateTournamentDetails: updateMutation.mutate,
  }
}
