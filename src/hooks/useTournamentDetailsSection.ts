import { useParams } from "react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { TournamentDetails, UpdateTournamentDetails } from "~/definitions/database"
import * as tournamentDetailsApi from "~/lib/ipc/tournamentDetails"

export function useTournamentDetailsSection() {
  const { id: eventId } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const queryKey = ["tournament_details", eventId] as const

  const invalidateKeys = () => {
    queryClient.invalidateQueries({ queryKey })
    queryClient.invalidateQueries({ queryKey: ["timeblocks", eventId] })
  }

  const query = useQuery({
    queryKey,
    queryFn: () => tournamentDetailsApi.getOrCreateTournamentDetailsByEventId(eventId!),
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
