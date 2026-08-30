import { useQuery } from "@tanstack/react-query"
import * as timeblocksIpc from "~/lib/ipc/timeblocks"

export function focusedTimeblockQueryKey(timeblockId: string) {
  return ["timeblock", timeblockId] as const
}

export function useFocusedTimeblock(timeblockId: string | null | undefined) {
  return useQuery({
    queryKey: focusedTimeblockQueryKey(timeblockId ?? ""),
    queryFn: async () => {
      if (!timeblockId) throw new Error("timeblockId is required")
      return timeblocksIpc.getTimeblockById(timeblockId)
    },
    enabled: !!timeblockId,
    retry: 1,
  })
}
