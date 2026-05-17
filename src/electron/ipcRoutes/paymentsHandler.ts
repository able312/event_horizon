import { ipcMain } from "electron"
import type { UpdatePayment } from "../../definitions/database.js"
import paymentQueries from "../db/repository/payments.js"
import { logAndThrow } from "./ipcErrors.js"

export const registerPaymentsIpcHandlers = () => {
  ipcMain.handle("payments:get-many", async () => {
    try {
      return paymentQueries.getAll()
    } catch (err) {
      logAndThrow("Error getting payments:", err)
    }
  })

  ipcMain.handle("payments:get-many-by-event-id", async (_event, id: string) => {
    try {
      return paymentQueries.getByEventId(id)
    } catch (err) {
      logAndThrow("Error getting payment:", err)
    }
  })

  ipcMain.handle("payments:post", async (_event, eventId: string) => {
    try {
      return paymentQueries.insert(eventId)
    } catch (err) {
      logAndThrow("Error creating payment:", err)
    }
  })

  ipcMain.handle("payments:patch", async (_event, id: string, updates: UpdatePayment) => {
    try {
      return paymentQueries.update(id, updates)
    } catch (err) {
      logAndThrow("Error updating payment:", err)
    }
  })

  ipcMain.handle("payments:delete", async (_event, id: string) => {
    try {
      return paymentQueries.delete(id)
    } catch (err) {
      logAndThrow("Error deleting payment:", err)
    }
  })
}
