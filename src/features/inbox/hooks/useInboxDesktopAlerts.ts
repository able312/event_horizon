import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useEventNotificationAlerts } from "~/features/event-notifications/hooks/useEventNotificationAlerts"
import { useEventRequestNotifications } from "~/features/event-requests/hooks/useEventRequestNotifications"
import { eventNotificationQueries, eventRequestQueries } from "~/lib/data/queries"
import { setInboxBadgeCount } from "~/lib/ipc/eventRequestNotifications"

/** The dock badge: pending website requests plus unread updates. Waits for a first load, so loading never reads as an empty Inbox. */
function useInboxBadge() {
  const requests = useQuery(eventRequestQueries.pending())
  const updates = useQuery(eventNotificationQueries.inbox())
  const pending = requests.data?.length
  const unread = updates.data?.filter(n => !n.read).length

  useEffect(() => {
    if (pending === undefined && unread === undefined) return
    void setInboxBadgeCount((pending ?? 0) + (unread ?? 0)).catch(error => console.error("Inbox badge:", error))
  }, [pending, unread])

  useEffect(() => () => {
    void setInboxBadgeCount(0).catch(error => console.error("Inbox badge:", error))
  }, [])
}

/** Desktop alerts and the badge for everything the Inbox shows. Mounted once in the signed-in app, across every route. */
export function useInboxDesktopAlerts() {
  useEventRequestNotifications()
  useEventNotificationAlerts()
  useInboxBadge()
}
