import { useQuery } from "@tanstack/react-query"

import { userQueries } from "~/lib/data/queries"

/** Every company account, kept live; used to name who created or last edited a record. */
export function useUsers() {
  return useQuery(userQueries.all())
}
