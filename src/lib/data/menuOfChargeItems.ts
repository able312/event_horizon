import type { ChargeCategory, MenuOfChargeItem, UpdateMenuOfChargeItem } from "~/definitions/database"

export function getMenuOfChargeItemsByEventId(eventId: string): Promise<MenuOfChargeItem[]> {
  return window.electron.ipcRenderer.invoke("menuOfChargeItems:get-many-by-event-id", eventId) as Promise<MenuOfChargeItem[]>
}

export function createMenuOfChargeItem(eventId: string, category?: ChargeCategory | null): Promise<MenuOfChargeItem> {
  return window.electron.ipcRenderer.invoke("menuOfChargeItems:post", eventId, category ?? null) as Promise<MenuOfChargeItem>
}

export function updateMenuOfChargeItem(id: string, updates: UpdateMenuOfChargeItem): Promise<MenuOfChargeItem> {
  return window.electron.ipcRenderer.invoke("menuOfChargeItems:patch", id, updates) as Promise<MenuOfChargeItem>
}

export function deleteMenuOfChargeItem(id: string): Promise<boolean> {
  return window.electron.ipcRenderer.invoke("menuOfChargeItems:delete", id) as Promise<boolean>
}
