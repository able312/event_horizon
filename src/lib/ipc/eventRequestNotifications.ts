/** Optional in browser previews; desktop notifications are owned by Electron. */
export async function notifyNewEventRequest(): Promise<void> {
  await window.api?.eventRequestNotifications?.notifyNewEventRequest()
}

export async function setPendingRequestCount(count: number): Promise<void> {
  await window.api?.eventRequestNotifications?.setPendingCount(count)
}
