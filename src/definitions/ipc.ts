export type GenerateMenuContext = {
  view: "event-details" | "other"
  eventId: string | null
}

import type { Event, EventStatus, EventType } from "./database.js"

export type EventSearchRequest = {
  query: string
  type: EventType | null
  status: EventStatus | null
  startFrom: string | null
  startTo: string | null
  page: number
  pageSize: number
}

export type EventSearchResponse = {
  items: Event[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}
