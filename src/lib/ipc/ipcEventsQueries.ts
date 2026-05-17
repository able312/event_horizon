import type { NewEvent, Event, UpdateEvent } from "~/definitions/database"
import type { EventSearchRequest, EventSearchResponse } from "~/definitions/ipc"
import type {
  IcsImportCommitRequest,
  IcsImportCommitResult,
  IcsImportReviewPayload,
} from "~/definitions/events/icsImport"

export function getAllEvents(): Promise<Event[]> {
  return window.electron.ipcRenderer.invoke("events:get-many") as Promise<Event[]>
}

export function getEventsByMonth(month: string): Promise<Event[]> {
  return window.electron.ipcRenderer.invoke("events:get-by-month", month) as Promise<Event[]>
}

export function getUnscheduledEvents(): Promise<Event[]> {
  return window.electron.ipcRenderer.invoke("events:get-unscheduled") as Promise<Event[]>
}

export function searchEvents(payload: EventSearchRequest): Promise<EventSearchResponse> {
  return window.electron.ipcRenderer.invoke("events:search", payload) as Promise<EventSearchResponse>
}

export function getEventById(id: string): Promise<Event> {
  return window.electron.ipcRenderer.invoke("events:get-by-id", id) as Promise<Event>
}

export function createEvent(newEvent: NewEvent): Promise<Event> {
  return window.electron.ipcRenderer.invoke("events:post", newEvent) as Promise<Event>
}

export function updateEvent(id: string, updates: UpdateEvent): Promise<Event> {
  return window.electron.ipcRenderer.invoke("events:patch", id, updates) as Promise<Event>
}

export function deleteEvent(id: string): Promise<boolean> {
  return window.electron.ipcRenderer.invoke("events:delete", id) as Promise<boolean>
}

export function commitIcsImport(payload: IcsImportCommitRequest): Promise<IcsImportCommitResult> {
  return window.electron.ipcRenderer.invoke("events:import-ics:commit", payload) as Promise<IcsImportCommitResult>
}

export function onIcsImportReview(
  listener: (payload: IcsImportReviewPayload) => void,
): () => void {
  const wrapped = (...args: unknown[]) => {
    const payload = args[0] as IcsImportReviewPayload | undefined
    if (!payload) return
    listener(payload)
  }

  window.electron.ipcRenderer.on("events:import-ics:review", wrapped)

  return () => {
    window.electron.ipcRenderer.removeListener("events:import-ics:review", wrapped)
  }
}
