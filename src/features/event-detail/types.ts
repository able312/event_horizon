import type { Event, UpdateEvent } from "~/definitions/database"

export interface EventResource {
  event: Event | undefined
  isLoading: boolean
  updateEvent: (updates: UpdateEvent) => Promise<Event>
  deleteEvent: () => Promise<boolean>
}
