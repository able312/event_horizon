import type { Timeblock, UpdateTimeblock } from "~/definitions/database"
import type { TimelineTimeblock } from "~/definitions/timeblocks/timeblocks-types";

export function getAllTimelineBlocks(eventId: string): Promise<TimelineTimeblock[]> {
  return window.electron.ipcRenderer.invoke("timeblocks:get-all-timeline-blocks", eventId) as Promise<TimelineTimeblock[]>
}

export function createTimeblock(data: { eventId: string; title: string; time?: string; sectionType: string }): Promise<Timeblock> {
  return window.electron.ipcRenderer.invoke("timeblocks:post", data) as Promise<Timeblock>
}

export function updateTimeblock(id: string, updates: UpdateTimeblock): Promise<Timeblock> {
  return window.electron.ipcRenderer.invoke("timeblocks:patch", id, updates) as Promise<Timeblock>
}

export function deleteTimeblock(id: string): Promise<boolean> {
  return window.electron.ipcRenderer.invoke("timeblocks:delete", id) as Promise<boolean>
}
