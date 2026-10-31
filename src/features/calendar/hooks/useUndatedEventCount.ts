import { useQuery } from "@tanstack/react-query"

import { eventQueries } from "~/lib/data/queries"

/**
 * How many events have no start date, for the calendar header shortcut. Shares the live
 * unscheduled list useEvents already keeps subscribed. Undefined while loading or on error:
 * the count is a hint, so it never blocks the calendar.
 */
export function useUndatedEventCount(): number | undefined {
  return useQuery(eventQueries.unscheduled()).data?.length
}
