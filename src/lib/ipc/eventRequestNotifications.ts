/** Optional in browser previews; desktop notifications are owned by Electron. */
export async function notifyNewEventRequest(): Promise<void> {
  await window.api?.eventRequestNotifications?.notifyNewEventRequest()
}

/** One alert for `count` new teammate changes; the main process writes the wording. */
export async function notifyEventUpdates(count: number): Promise<void> {
  await window.api?.eventRequestNotifications?.notifyEventUpdates(count)
}

/** The dock badge: pending requests plus unread updates. */
export async function setInboxBadgeCount(count: number): Promise<void> {
  await window.api?.eventRequestNotifications?.setPendingCount(count)
}
