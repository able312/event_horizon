import type { UpdateNote, Note, Timeblock } from "~/definitions/database"
import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types";

export function getNotesByEvent(eventId: string): Promise<TimeblockWithItems[]> {
  return window.electron.ipcRenderer.invoke("notes:get-by-event", eventId) as Promise<TimeblockWithItems[]>
}

export function createNote(eventId: string): Promise<{ timeblock: Timeblock; note: Note }> {
  return window.electron.ipcRenderer.invoke("notes:post", eventId) as Promise<{ timeblock: Timeblock; note: Note }>
}

export function updateNote(id: string, data: UpdateNote): Promise<Note> {
  return window.electron.ipcRenderer.invoke("notes:patch", id, data ) as Promise<Note>
}

export function deleteNote(timeblockId: string): Promise<boolean> {
  return window.electron.ipcRenderer.invoke("notes:delete", timeblockId) as Promise<boolean>
}
