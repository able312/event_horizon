export type EventRequestNotificationsApi = {
  notifyNewEventRequest: () => Promise<void>
  setPendingCount: (count: number) => Promise<void>
}
