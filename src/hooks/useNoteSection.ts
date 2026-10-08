import { useParams } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { useTimeblockMutations } from "./useTimeblockMutations"
import { timeblockQueries } from "~/lib/data/queries"


export function useNoteSection() {
  const { id: eventId } = useParams()

  const notesQuery = timeblockQueries.notes(eventId ?? "")
  const queryKey = notesQuery.queryKey

  const query = useQuery({
    ...notesQuery,
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
