import { useQuery } from "@tanstack/react-query"
import { eventQueries } from "~/lib/data/queries"

/** Every New Lead event, dated or not. Shared by the New leads view and its header badge. */
export function useNewLeads() {
  const leadsQuery = useQuery(eventQueries.newLeads())
  return { leadsQuery, leads: leadsQuery.data ?? [] }
}
