import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { VenueSettings } from "~/definitions/database"
import * as venueSettingsApi from "~/lib/data/venueSettings"
import { venueSettingsQueries } from "~/lib/data/queries"

/** The venue-wide settings, kept live (null until first saved), and a save for the default estimate terms. */
export function useVenueSettings() {
  const queryClient = useQueryClient()
  const settingsQuery = venueSettingsQueries.get()
  const queryKey = settingsQuery.queryKey

  const query = useQuery(settingsQuery)

  const setTermsMutation = useMutation({
    mutationFn: (terms: string | null) => venueSettingsApi.setDefaultEstimateTerms(terms),
    onMutate: async (terms) => {
      await queryClient.cancelQueries({ queryKey })
      const previousSettings = queryClient.getQueryData<VenueSettings | null>(queryKey)

      // Before the first save there is no record to update; onSuccess stores the new one.
      queryClient.setQueryData<VenueSettings | null>(queryKey, (old) =>
        old ? { ...old, defaultEstimateTerms: terms } : old
      )

      return { previousSettings }
    },
    onSuccess: (settings) => {
      queryClient.setQueryData<VenueSettings | null>(queryKey, settings)
    },
    onError: (_err, _terms, context) => {
      if (context?.previousSettings !== undefined) {
        queryClient.setQueryData(queryKey, context.previousSettings)
      }
      toast.error("Failed to save default terms")
      console.error("Error saving default estimate terms:", _err)
    },
  })

  return {
    ...query,
    setDefaultEstimateTerms: setTermsMutation.mutate,
  }
}
