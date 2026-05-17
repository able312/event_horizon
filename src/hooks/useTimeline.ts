import { useParams } from "react-router"
import { useQuery } from "@tanstack/react-query"
import type { TimelineTimeblock } from "~/definitions/timeblocks/timeblocks-types"
import * as timeblocksIpc from "~/lib/ipc/timeblocks"
import { useTimeblockMutations } from "./useTimeblockMutations"

export function useTimeline() {
  const { id } = useParams()

  const queryKey = ["timeblocks", id!] as const

  const query = useQuery<TimelineTimeblock[]>({
    queryKey,
    queryFn: async () => {
      return await timeblocksIpc.getAllTimelineBlocks(id!)
    },
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
