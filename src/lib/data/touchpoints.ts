import type {
  IncompleteTouchpointWithEvent,
  NewTouchpoint,
  Touchpoint,
  UpdateTouchpoint,
} from "~/definitions/database"

export function getTouchpointsByEventId(eventId: string): Promise<Touchpoint[]> {
  return window.electron.ipcRenderer.invoke(
    "touchpoints:get-many-by-event-id",
    eventId,
  ) as Promise<Touchpoint[]>
}

export function getIncompleteTouchpoints(): Promise<IncompleteTouchpointWithEvent[]> {
  return window.electron.ipcRenderer.invoke(
    "touchpoints:get-many-incomplete",
  ) as Promise<IncompleteTouchpointWithEvent[]>
}

export function getIncompleteTouchpointsByEventId(eventId: string): Promise<Touchpoint[]> {
  return window.electron.ipcRenderer.invoke(
    "touchpoints:get-incomplete-by-event-id",
    eventId,
  ) as Promise<Touchpoint[]>
}

export function createTouchpoint(
  eventId: string,
  values?: Partial<Pick<NewTouchpoint, "title" | "dueDate" | "completedAt">>,
): Promise<Touchpoint> {
  return window.electron.ipcRenderer.invoke(
    "touchpoints:post",
    eventId,
    values,
  ) as Promise<Touchpoint>
}

export function updateTouchpoint(id: string, updates: UpdateTouchpoint): Promise<Touchpoint> {
  return window.electron.ipcRenderer.invoke(
    "touchpoints:patch",
    id,
    updates,
  ) as Promise<Touchpoint>
}

export function deleteTouchpoint(id: string): Promise<boolean> {
  return window.electron.ipcRenderer.invoke("touchpoints:delete", id) as Promise<boolean>
}

export function seedCommonTouchpoints(eventId: string): Promise<Touchpoint[]> {
  return window.electron.ipcRenderer.invoke(
    "touchpoints:seed-common",
    eventId,
  ) as Promise<Touchpoint[]>
}
