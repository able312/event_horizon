import { ipcMain } from "electron"
import timeblockQueries from "../db/repository/timeblocks.js"
import { logAndThrow } from "./ipcErrors.js"

export const registerTimeblocksIpcHandlers = () => {
  ipcMain.handle("timeblocks:post", async (_event, data: { eventId: string; title: string; time?: string; sectionType: string }) => {
    try {
      return timeblockQueries.insert({
        eventId: data.eventId,
        title: data.title,
        time: data.time ?? null,
        sectionType: data.sectionType as 'food' | 'beverage' | 'vendor' | 'note'
      })
    } catch (err) {
      logAndThrow("Error creating timeblock:", err)
    }
  })

  ipcMain.handle("timeblocks:patch", async (_event, id: string, updates: { title?: string; time?: string; displayOrder?: number }) => {
    try {
      return timeblockQueries.update(id, updates)
    } catch (err) {
      logAndThrow("Error updating timeblock:", err)
    }
  })

  ipcMain.handle("timeblocks:delete", async (_event, id: string) => {
    try {
      return timeblockQueries.delete(id)
    } catch (err) {
      logAndThrow("Error deleting timeblock:", err)
    }
  })

  ipcMain.handle("timeblocks:get-all-timeline-blocks", async (_event, eventId: string) => {
    try {
      return timeblockQueries.getAllTimelineBlocks(eventId)
    } catch (err) {
      logAndThrow("Error getting all timeblocks with items:", err)
    }
  })
}
