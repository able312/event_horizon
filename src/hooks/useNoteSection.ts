import { useParams } from "react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTimeblockMutations } from "./useTimeblockMutations"
import { toast } from "sonner"
import type { UpdateNote } from "~/definitions/database"
import * as notesIpc from "~/lib/ipc/notes"
import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import {
  replaceTimeblockById,
  updateNestedOneToOneById,
} from "./util/optimisticTimeblockCache"


export function useNoteSection() {
  const { id: eventId } = useParams()
  const queryClient = useQueryClient()

  const queryKey = ["note", eventId] as const

  const invalidateKeys = () => {
    queryClient.invalidateQueries({ queryKey })
    queryClient.invalidateQueries({ queryKey: ["timeblocks", eventId] })
  }

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      return await notesIpc.getNotesByEvent(eventId!)
    },
    enabled: !!eventId,
  })

  const { removeTimeblock, updateTimeblock } = useTimeblockMutations({
    queryKey,
    eventId: eventId!,
    sectionType: "note",
  })

  const addNoteMutation = useMutation({
    mutationFn: () => notesIpc.createNote(eventId!),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey })
      const previousData = queryClient.getQueryData<TimeblockWithItems[]>(queryKey)

      const tempId = `temp_${Date.now()}`
      const now = new Date().toISOString()
      const optimisticNote: TimeblockWithItems = {
        id: tempId,
        eventId: eventId!,
        title: "",
        time: "",
        sectionType: "note",
        assignedTo: null,
        note:{
          id: tempId,
          timeblockId: tempId,
          content: "",
          createdAt: now,
          updatedAt: now,
        },
        createdAt: now,
        updatedAt: null,
      }

      queryClient.setQueryData<TimeblockWithItems[]>(queryKey, (old = []) => [
        ...old,
        optimisticNote,
      ])

      return { previousData, tempId }
    },
    onSuccess: (createdNote, _variables, context) => {
      if (!context) return

      const serverTimeblock: TimeblockWithItems = {
        ...createdNote.timeblock,
        note: createdNote.note,
      }

      queryClient.setQueryData<TimeblockWithItems[]>(queryKey, (old = []) =>
        replaceTimeblockById(old, context.tempId, serverTimeblock)
      )
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData)
      }
      toast.error("Failed to create note")
      console.error("Error creating note:", _err)
    },
    onSettled: () => {
      invalidateKeys()
    },
  })

  const updateNoteMutation = useMutation({
    mutationFn: (data: { id: string, updates: UpdateNote }) =>
      notesIpc.updateNote(data.id, data.updates),
    onMutate: async (args) => {
      await queryClient.cancelQueries({ queryKey })
      const previousData = queryClient.getQueryData<TimeblockWithItems[]>(queryKey)

      queryClient.setQueryData<TimeblockWithItems[]>(queryKey, (old = []) =>
        updateNestedOneToOneById(old, "note", args.id, args.updates)
      )

      return { previousData }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData)
      }
      toast.error("Failed to update note")
      console.error("Error updating note:", _err)
    },
    onSettled: () => {
      invalidateKeys()
    },
  })

  return {
    ...query,
    addNote: addNoteMutation.mutate,
    updateNote: updateNoteMutation.mutate,
    removeTimeblock,
    updateTimeblock,
  }
}
