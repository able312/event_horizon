import { ipcMain } from "electron"
import foodItemQueries from "../db/repository/foodItems.js"
import type { NewFoodItem, UpdateFoodItem } from "~/definitions/database.js"
import { logAndThrow } from "./ipcErrors.js"

export const registerFoodItemsIpcHandlers = () => {
  ipcMain.handle("food-items:get-by-event", async (_event, eventId: string) => {
    try {
      return await foodItemQueries.getByEventId(eventId)
    } catch (err) {
      logAndThrow("Error fetching food section:", err)
    }
  })

  ipcMain.handle("food-items:post", async (_event, data: NewFoodItem) => {
    try {
      return foodItemQueries.insert(data)
    } catch (err) {
      logAndThrow("Error creating food item:", err)
    }
  })

  ipcMain.handle("food-items:patch", async (_event, id: string, updates: UpdateFoodItem) => {
    try {
      return foodItemQueries.update(id, updates)
    } catch (err) {
      logAndThrow("Error updating food item:", err)
    }
  })

  ipcMain.handle("food-items:delete", async (_event, id: string) => {
    try {
      return foodItemQueries.delete(id)
    } catch (err) {
      logAndThrow("Error deleting food item:", err)
    }
  })
}
