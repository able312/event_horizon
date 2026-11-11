import { useEffect, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { eventRequestQueries } from "~/lib/data/queries"
import { detectNewIds } from "~/lib/notifications/newIdDetection"
import { notifyNewEventRequest } from "~/lib/ipc/eventRequestNotifications"

/** Desktop alerts for new website requests. Mounted once in the signed-in app (useInboxDesktopAlerts). */
export function useEventRequestNotifications() {
  const query = useQuery(eventRequestQueries.pending())
  const seen = useRef<ReadonlySet<string> | null>(null)

  useEffect(() => {
    // Loading/errors aren't an empty Inbox and must not reset the baseline.
    if (!query.isSuccess) return
    const detection = detectNewIds(seen.current, query.data.map(request => request.id))
    seen.current = detection.seen
    if (detection.newIds.length > 0) {
      void notifyNewEventRequest().catch(error => console.error("Inbox notification:", error))
    }
  }, [query.data, query.isSuccess])
}
