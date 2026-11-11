import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import type { CurrentUser } from "~/definitions/database"
import { userKeys, userQueries } from "~/lib/data/queries"
import * as usersApi from "~/lib/data/users"

/** The signed-in account (null until sign-in has stored it), kept live, and a save for their name. */
export function useCurrentUser() {
  const queryClient = useQueryClient()
  const query = useQuery(userQueries.current())

  const nameMutation = useMutation({
    mutationFn: (name: string | null) => usersApi.updateCurrentUserName(name),
    onSuccess: (user) => {
      queryClient.setQueryData<CurrentUser | null>(userKeys.current(), user)
      // Audit labels ("Last edited by …") read the team list, which shows the new name
      void queryClient.invalidateQueries({ queryKey: userKeys.all(), exact: true })
      toast.success("Name saved")
    },
    onError: (err) => {
      toast.error("Failed to save your name")
      console.error("Error saving profile name:", err)
    },
  })

  return {
    ...query,
    saveName: nameMutation.mutate,
    isSavingName: nameMutation.isPending,
  }
}
