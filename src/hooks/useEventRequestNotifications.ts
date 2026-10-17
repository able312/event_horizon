import { useEffect, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { eventRequestQueries } from "~/lib/data/queries"
import { detectNewRequestIds } from "~/lib/eventRequests/newRequestDetection"
import { notifyNewEventRequest, setPendingRequestCount } from "~/lib/ipc/eventRequestNotifications"

/** Mounted once in the signed-in app, across every route. */
export function useEventRequestNotifications() {
  const query = useQuery(eventRequestQueries.pending())
  const seen = useRef<ReadonlySet<string> | null>(null)

  useEffect(() => {
    // Loading/errors aren't an empty Inbox and must not reset the baseline or badge.
    if (!query.isSuccess) return
    const detection = detectNewRequestIds(seen.current, query.data.map(request => request.id))
    seen.current = detection.seen
    void setPendingRequestCount(query.data.length).catch(error => console.error("Inbox badge:", error))
    if (detection.newIds.length > 0) {
      void notifyNewEventRequest().catch(error => console.error("Inbox notification:", error))
    }
  }, [query.data, query.isSuccess])

  useEffect(() => () => {
    void setPendingRequestCount(0).catch(error => console.error("Inbox badge:", error))
  }, [])
}
