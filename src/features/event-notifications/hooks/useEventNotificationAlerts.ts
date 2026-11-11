import { useEffect, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { eventNotificationQueries } from "~/lib/data/queries"
import { detectNewIds } from "~/lib/notifications/newIdDetection"
import { notifyEventUpdates } from "~/lib/ipc/eventRequestNotifications"

/**
 * One desktop alert per batch of new unread updates from teammates. Updates already
 * in the Inbox at startup are silent, and an update a teammate keeps editing keeps
 * its ID, so it alerts once. Mounted once in the signed-in app (useInboxDesktopAlerts).
 */
export function useEventNotificationAlerts() {
  const query = useQuery(eventNotificationQueries.inbox())
  const seen = useRef<ReadonlySet<string> | null>(null)

  useEffect(() => {
    if (!query.isSuccess) return
    const detection = detectNewIds(seen.current, query.data.filter(n => !n.read).map(n => n.id))
    seen.current = detection.seen
    if (detection.newIds.length > 0) {
      void notifyEventUpdates(detection.newIds.length).catch(error => console.error("Inbox notification:", error))
    }
  }, [query.data, query.isSuccess])
}
