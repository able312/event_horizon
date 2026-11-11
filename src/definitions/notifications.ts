/** Desktop alerts and the dock badge for the Inbox (website requests and event updates). */
export type EventRequestNotificationsApi = {
  notifyNewEventRequest: () => Promise<void>
  /** `count` new event updates from teammates; only the count crosses IPC. */
  notifyEventUpdates: (count: number) => Promise<void>
  /** Badge count: pending requests plus unread updates. */
  setPendingCount: (count: number) => Promise<void>
}
