import { useParams } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { timeblockQueries } from "~/lib/data/queries"
import { useTimeblockMutations } from "./useTimeblockMutations"

export function useTimeline() {
  const { id } = useParams()

  const timelineQuery = timeblockQueries.timeline(id ?? "")
  const queryKey = timelineQuery.queryKey

  const query = useQuery({
    ...timelineQuery,
    enabled: !!id,
  })

  const { addTimeblock, updateTimeblock, removeTimeblock } = useTimeblockMutations({
    queryKey,
    eventId: id!,
    sectionType: "note"
  })

  return {
    ...query,
    addTimeblock,
    updateTimeblock,
    removeTimeblock
  }
}
