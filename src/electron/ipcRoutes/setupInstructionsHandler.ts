import { ipcMain } from "electron"
import setupInstructionQueries from "../db/repository/setupInstructions.js"
import type { UpdateSetupInstruction } from "../../definitions/database.js"
import { logAndThrow } from "./ipcErrors.js"

export const registerSetupInstructionsIpcHandlers = () => {
  ipcMain.handle("setup-instructions:get-by-event", async (_event, eventId: string) => {
    try {
      return await setupInstructionQueries.getByEventId(eventId)
    } catch (err) {
      logAndThrow("Error fetching setup instructions:", err)
    }
  })

  ipcMain.handle("setup-instructions:post", async (_event, eventId) => {
    try {
      return setupInstructionQueries.create(eventId)
    } catch (err) {
      logAndThrow("Error creating setup instruction:", err)
    }
  })

  ipcMain.handle("setup-instructions:patch", async (_event, id: string, updates: UpdateSetupInstruction) => {
    try {
      return setupInstructionQueries.update(id, updates)
    } catch (err) {
      logAndThrow("Error updating setup instruction:", err)
    }
  })

  ipcMain.handle("setup-instructions:delete", async (_event, timeblockId: string) => {
    try {
      return setupInstructionQueries.delete(timeblockId)
    } catch (err) {
      logAndThrow("Error deleting setup instruction:", err)
    }
  })
}
