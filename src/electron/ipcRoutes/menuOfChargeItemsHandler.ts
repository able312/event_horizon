import { ipcMain } from "electron"
import type { UpdateMenuOfChargeItem } from "../../definitions/database.js"
import menuOfChargeItemsQueries from "../db/repository/menuOfChargeItems.js"
import { logAndThrow } from "./ipcErrors.js"

export const registerMenuOfChargeItemsIpcHandlers = () => {
  ipcMain.handle("menuOfChargeItems:get-many", async () => {
    try {
      return menuOfChargeItemsQueries.getAll()
    } catch (err) {
      logAndThrow("Error getting menu of charge items:", err)
    }
  })

  ipcMain.handle("menuOfChargeItems:get-many-by-event-id", async (_event, id: string) => {
    try {
      return menuOfChargeItemsQueries.getByEventId(id)
    } catch (err) {
      logAndThrow("Error getting menu of charge item:", err)
    }
  })

  ipcMain.handle("menuOfChargeItems:post", async (_event, eventId: string, category: UpdateMenuOfChargeItem["category"] = null) => {
    try {
      return menuOfChargeItemsQueries.insert(eventId, category)
    } catch (err) {
      logAndThrow("Error creating menu of charge item:", err)
    }
  })

  ipcMain.handle("menuOfChargeItems:patch", async (_event, id: string, updates: UpdateMenuOfChargeItem) => {
    try {
      return menuOfChargeItemsQueries.update(id, updates)
    } catch (err) {
      logAndThrow("Error updating menu of charge item:", err)
    }
  })

  ipcMain.handle("menuOfChargeItems:delete", async (_event, id: string) => {
    try {
      return menuOfChargeItemsQueries.delete(id)
    } catch (err) {
      logAndThrow("Error deleting menu of charge item:", err)
    }
  })
}
