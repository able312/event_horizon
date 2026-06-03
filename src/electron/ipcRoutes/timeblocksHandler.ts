import { ipcMain } from "electron"
import timeblockQueries from "../db/repository/timeblocks.js"
import type { CreateTimeblockInput } from "../../definitions/timeblocks/timeblock-create.js"
import type { TimeblockType, TimelineTimeblock } from "../../definitions/timeblocks/timeblocks-types.js"
import type { UpdateTimeblock } from "../../definitions/database.js"
import { logAndThrow } from "./ipcErrors.js"

export const registerTimeblocksIpcHandlers = () => {
  ipcMain.handle("timeblocks:get-by-event-and-section", async (_event, eventId: string, sectionType: TimeblockType) => {
    try {
      return await timeblockQueries.getByEventIdAndSectionType(eventId, sectionType)
    } catch (err) {
      logAndThrow("Error fetching timeblocks by section:", err)
    }
  })

  ipcMain.handle("timeblocks:post", async (_event, data: CreateTimeblockInput) => {
    try {
      return timeblockQueries.insert(data)
    } catch (err) {
      logAndThrow("Error creating timeblock:", err)
    }
  })

  ipcMain.handle("timeblocks:patch", async (_event, id: string, updates: UpdateTimeblock) => {
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

  ipcMain.handle("timeblocks:get-all-timeline-blocks", async (_event, eventId: string): Promise<TimelineTimeblock[]> => {
    try {
      return timeblockQueries.getAllTimelineBlocks(eventId)
    } catch (err) {
      logAndThrow("Error getting all timeblocks with items:", err)
    }
  })
}
