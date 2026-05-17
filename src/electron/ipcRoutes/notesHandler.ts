import { ipcMain } from "electron"
import notesQueries from "../db/repository/notes.js"
import type { UpdateNote } from "../../definitions/database.js"
import { logAndThrow } from "./ipcErrors.js"

export const registerNotesIpcHandlers = () => {
  ipcMain.handle("notes:get-by-event", async (_event, eventId: string) => {
    try {
      return await notesQueries.getByEventId(eventId)
    } catch (err) {
      logAndThrow("Error fetching notes:", err)
    }
  })

  ipcMain.handle("notes:post", async (_event, eventId) => {
    try {
      return notesQueries.create(eventId)
    } catch (err) {
      logAndThrow("Error creating note:", err)
    }
  })

  ipcMain.handle("notes:patch", async (_event, id: string, updates: UpdateNote) => {
    try {
      return notesQueries.update(id, updates)
    } catch (err) {
      logAndThrow("Error updating note:", err)
    }
  })

  ipcMain.handle("notes:delete", async (_event, timeblockId: string) => {
    try {
      return notesQueries.delete(timeblockId)
    } catch (err) {
      logAndThrow("Error deleting note:", err)
    }
  })
}
