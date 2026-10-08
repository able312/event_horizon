import type { FoodItem } from "~/definitions/database"
import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types";

export function getFoodSectionWithItems(eventId: string): Promise<TimeblockWithItems[]> {
  return window.electron.ipcRenderer.invoke("food-items:get-by-event", eventId) as Promise<TimeblockWithItems[]>
}

export function createFoodItem(data: { timeblockId: string; name: string; quantity?: number; serviceStyle?: string; includes?: string; unitPriceCents?: number }): Promise<FoodItem> {
  return window.electron.ipcRenderer.invoke("food-items:post", data) as Promise<FoodItem>
}

export function updateFoodItem(id: string, updates: { name?: string; quantity?: number; serviceStyle?: string; includes?: string; unitPriceCents?: number }): Promise<FoodItem> {
  return window.electron.ipcRenderer.invoke("food-items:patch", id, updates) as Promise<FoodItem>
}

export function deleteFoodItem(id: string): Promise<boolean> {
  return window.electron.ipcRenderer.invoke("food-items:delete", id) as Promise<boolean>
}
