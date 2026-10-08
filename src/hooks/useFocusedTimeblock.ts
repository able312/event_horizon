import { useQuery } from "@tanstack/react-query"
import { timeblockQueries } from "~/lib/data/queries"

export function useFocusedTimeblock(timeblockId: string | null | undefined) {
  return useQuery({
    ...timeblockQueries.byId(timeblockId ?? ""),
    enabled: !!timeblockId,
    retry: 1,
  })
}
