export type GenerateMenuContext = {
  view: "event-details" | "other"
  eventId: string | null
}

import type { ContactsErrorPayload } from "./contacts.js"
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

/**
 * Envelope for channels whose expected failures carry data the renderer needs.
 * Electron only forwards an error's message across IPC, so typed errors travel as values.
 */
export type IpcResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ContactsErrorPayload }
