import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import type { EventNotification } from "~/definitions/database"
import * as eventNotificationsApi from "~/lib/data/eventNotifications"
import { eventNotificationKeys, eventNotificationQueries } from "~/lib/data/queries"

/** How long Undo stays offered after a dismiss. */
export const NOTIFICATION_DISMISS_UNDO_MS = 10_000

type CachedNotifications = EventNotification[] | undefined

/**
 * Teammates' event changes in the signed-in user's Inbox, newest first, with read
 * and dismiss. Each change shows in the cache right away and is put back if it fails;
 * the live query then confirms it.
 */
export function useEventNotifications() {
  const queryClient = useQueryClient()
  const notificationsQuery = useQuery(eventNotificationQueries.inbox())
  const key = eventNotificationKeys.inbox()

  async function applyOptimistic(update: (old: EventNotification[]) => EventNotification[]) {
    await queryClient.cancelQueries({ queryKey: key })
    const previous = queryClient.getQueryData<EventNotification[]>(key)
    queryClient.setQueryData<EventNotification[]>(key, (old) => (old ? update(old) : old))
    return { previous }
  }
  const rollBack = (context: { previous: CachedNotifications } | undefined) => queryClient.setQueryData(key, context?.previous)

  const markReadMutation = useMutation({
    mutationFn: (id: string) => eventNotificationsApi.markEventNotificationRead(id),
    onMutate: (id) => applyOptimistic((old) => old.map((n) => (n.id === id ? { ...n, read: true } : n))),
    // Quiet: it will show as unread again, which is what failed
    onError: (_err, _id, context) => rollBack(context),
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => eventNotificationsApi.markAllEventNotificationsRead(),
    onMutate: () => applyOptimistic((old) => old.map((n) => ({ ...n, read: true }))),
    onError: (_err, _vars, context) => {
      rollBack(context)
      toast.error("Failed to mark updates as read")
    },
  })

  const restoreMutation = useMutation({
    mutationFn: (id: string) => eventNotificationsApi.restoreEventNotification(id),
    onError: () => {
      toast.error("Failed to restore update")
    },
  })

  const dismissMutation = useMutation({
    mutationFn: (id: string) => eventNotificationsApi.dismissEventNotification(id),
    onMutate: (id) => applyOptimistic((old) => old.filter((n) => n.id !== id)),
    onError: (_err, _id, context) => {
      rollBack(context)
      toast.error("Failed to dismiss update")
    },
    onSuccess: (_result, id) => {
      toast("Update dismissed", {
        duration: NOTIFICATION_DISMISS_UNDO_MS,
        action: { label: "Undo", onClick: () => restoreMutation.mutate(id) },
      })
    },
  })

  const notifications = notificationsQuery.data ?? []
  return {
    notificationsQuery,
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
    /** Stable across renders (React Query's mutate), so effects can depend on it. */
    markRead: markReadMutation.mutate,
    markAllRead: () => markAllReadMutation.mutate(),
    dismiss: (id: string) => dismissMutation.mutate(id),
  }
}
