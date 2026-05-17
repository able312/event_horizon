import type { BeverageItem } from "~/definitions/database"
import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types";

export function getBeverageSectionWithItems(eventId: string): Promise<TimeblockWithItems[]> {
  return window.electron.ipcRenderer.invoke("beverage-items:get-by-event", eventId) as Promise<TimeblockWithItems[]>
}

export function createBeverageItem(data: { timeblockId: string; name: string; quantity?: number; type?: string; serviceStyle?: string; includes?: string; unitPriceCents?: number }): Promise<BeverageItem> {
  return window.electron.ipcRenderer.invoke("beverage-items:post", data) as Promise<BeverageItem>
}

export function updateBeverageItem(id: string, updates: { name?: string; quantity?: number; type?: string; serviceStyle?: string; includes?: string; unitPriceCents?: number }): Promise<BeverageItem> {
  return window.electron.ipcRenderer.invoke("beverage-items:patch", id, updates) as Promise<BeverageItem>
}

export function deleteBeverageItem(id: string): Promise<boolean> {
  return window.electron.ipcRenderer.invoke("beverage-items:delete", id) as Promise<boolean>
}
