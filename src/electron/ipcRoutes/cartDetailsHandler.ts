import { ipcMain } from "electron"
import type { UpdateCartDetails } from "../../definitions/database.js"
import cartDetailsQueries from "../db/repository/cartDetails.js"
import { logAndThrow } from "./ipcErrors.js"

export const registerCartDetailsIpcHandlers = () => {
  ipcMain.handle("cart-details:get-many", async () => {
    try {
      return cartDetailsQueries.getAll()
    } catch (err) {
      logAndThrow("Error getting cart details:", err)
    }
  })

  ipcMain.handle("cart-details:get-by-event-id", async (_event, id: string) => {
    try {
      return cartDetailsQueries.getByEventId(id)
    } catch (err) {
      logAndThrow("Error getting cart details:", err)
    }
  })

  ipcMain.handle("cart-details:get-or-create-by-event-id", async (_event, id: string) => {
    try {
      return cartDetailsQueries.getOrCreateByEventId(id)
    } catch (err) {
      logAndThrow("Error getting or creating cart details:", err)
    }
  })

  ipcMain.handle("cart-details:post", async (_event, eventId: string) => {
    try {
      return cartDetailsQueries.insert(eventId)
    } catch (err) {
      logAndThrow("Error creating cart details:", err)
    }
  })

  ipcMain.handle("cart-details:patch", async (_event, id: string, updates: UpdateCartDetails) => {
    try {
      return cartDetailsQueries.update(id, updates)
    } catch (err) {
      logAndThrow("Error updating cart details:", err)
    }
  })

  ipcMain.handle("cart-details:delete", async (_event, id: string) => {
    try {
      return cartDetailsQueries.delete(id)
    } catch (err) {
      logAndThrow("Error deleting cart details:", err)
    }
  })
}
