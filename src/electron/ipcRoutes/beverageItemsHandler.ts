import { ipcMain } from "electron"
import beverageItemQueries from "../db/repository/beverageItems.js"
import type { NewBeverageItem, UpdateBeverageItem } from "~/definitions/database.js"
import { logAndThrow } from "./ipcErrors.js"

export const registerBeverageItemsIpcHandlers = () => {
  ipcMain.handle("beverage-items:get-by-event", async (_event, eventId: string) => {
    try {
      return await beverageItemQueries.getByEventId(eventId)
    } catch (err) {
      logAndThrow("Error fetching beverage section:", err)
    }
  })

  ipcMain.handle("beverage-items:post", async (_event, data: NewBeverageItem) => {
    try {
      return beverageItemQueries.insert(data)
    } catch (err) {
      logAndThrow("Error creating beverage item:", err)
    }
  })

  ipcMain.handle("beverage-items:patch", async (_event, id: string, updates: UpdateBeverageItem) => {
    try {
      return beverageItemQueries.update(id, updates)
    } catch (err) {
      logAndThrow("Error updating beverage item:", err)
    }
  })

  ipcMain.handle("beverage-items:delete", async (_event, id: string) => {
    try {
      return beverageItemQueries.delete(id)
    } catch (err) {
      logAndThrow("Error deleting beverage item:", err)
    }
  })

  ipcMain.handle("beverage-items:set-timeblocks", async (_event, itemId: string, timeblockIds: string[]) => {
    try {
      return beverageItemQueries.setItemTimeblocks(itemId, timeblockIds)
    } catch (err) {
      logAndThrow("Error assigning beverage item timeblocks:", err)
    }
  })
}
