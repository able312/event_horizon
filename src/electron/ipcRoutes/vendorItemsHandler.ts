import { ipcMain } from "electron"
import vendorItemQueries from "../db/repository/vendorItems.js"
import type { UpdateVendorItem } from "../../definitions/database.js"
import { logAndThrow } from "./ipcErrors.js"

export const registerVendorItemsIpcHandlers = () => {
  ipcMain.handle("vendor-items:get-by-event", async (_event, eventId: string) => {
    try {
      return await vendorItemQueries.getByEventId(eventId)
    } catch (err) {
      logAndThrow("Error fetching vendors:", err)
    }
  })

  ipcMain.handle("vendor-items:post", async (_event, eventId) => {
    try {
      return vendorItemQueries.create(eventId)
    } catch (err) {
      logAndThrow("Error creating vendor:", err)
    }
  })

  ipcMain.handle("vendor-items:patch", async (_event, id: string, updates: UpdateVendorItem) => {
    try {
      return vendorItemQueries.update(id, updates)
    } catch (err) {
      logAndThrow("Error updating vendor:", err)
    }
  })

  ipcMain.handle("vendor-items:delete", async (_event, timeblockId: string) => {
    try {
      return vendorItemQueries.delete(timeblockId)
    } catch (err) {
      logAndThrow("Error deleting vendor:", err)
    }
  })
}
