import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { AssignContactTarget } from "~/definitions/contacts"
import type { EventRequest, NewEvent } from "~/definitions/database"
import { isContactsError } from "~/lib/contacts/contactsError"
import * as eventRequestsApi from "~/lib/data/eventRequests"
import { eventRequestKeys, eventRequestQueries } from "~/lib/data/queries"

type AcceptVariables = { id: string; newEvent: NewEvent; client: AssignContactTarget }

/** Website requests waiting in the Inbox, newest first, with accept and dismiss. Shared by the Inbox and its header badge. */
export function useEventRequests() {
  const queryClient = useQueryClient()
  const requestsQuery = useQuery(eventRequestQueries.pending())

  const acceptMutation = useMutation({
    mutationFn: ({ id, newEvent, client }: AcceptVariables) => eventRequestsApi.acceptEventRequest(id, newEvent, client),
    onError: (err) => {
      // The review form shows a taken email next to the client fields.
      if (isContactsError(err) && err.code === "EmailTaken") return
      toast.error("Failed to accept request")
    },
  })

  // Hidden right away, and put back if the dismiss fails.
  const dismissMutation = useMutation({
    mutationFn: (id: string) => eventRequestsApi.dismissEventRequest(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: eventRequestKeys.pending() })
      const previous = queryClient.getQueryData<EventRequest[]>(eventRequestKeys.pending())
      queryClient.setQueryData<EventRequest[]>(eventRequestKeys.pending(), (old) => old?.filter((request) => request.id !== id))
      return { previous }
    },
    onError: (_err, _id, context) => {
      queryClient.setQueryData(eventRequestKeys.pending(), context?.previous)
      toast.error("Failed to dismiss request")
    },
  })

  return {
    requestsQuery,
    requests: requestsQuery.data ?? [],
    acceptRequest: (id: string, newEvent: NewEvent, client: AssignContactTarget) =>
      acceptMutation.mutateAsync({ id, newEvent, client }),
    dismissRequest: (id: string) => dismissMutation.mutate(id),
  }
}
