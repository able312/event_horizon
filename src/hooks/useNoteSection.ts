import { useParams } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { useTimeblockMutations } from "./useTimeblockMutations"
import * as timeblocksIpc from "~/lib/ipc/timeblocks"


export function useNoteSection() {
  const { id: eventId } = useParams()

  const queryKey = ["note", eventId] as const

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      return await timeblocksIpc.getTimeblocksByEventAndSection(eventId!, "note")
    },
    enabled: !!eventId,
  })

  const { addTimeblock, addTimeblockAsync, removeTimeblock, updateTimeblock, isCreating, isMutating } =
    useTimeblockMutations({
      queryKey,
      eventId: eventId!,
      sectionType: "note",
    })

  return {
    ...query,
    addNote: addTimeblock,
    addNoteAsync: addTimeblockAsync,
    removeTimeblock,
    updateTimeblock,
    isCreating,
    isMutating,
  }
}
