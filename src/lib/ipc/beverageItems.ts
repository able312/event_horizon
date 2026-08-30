import type { BeverageItem, BeverageItemType } from "~/definitions/database"
import type { BeverageItemWithAssignments, BeverageSectionPayload } from "~/definitions/beverage/beverage-types"

export function getBeverageSectionWithItems(eventId: string): Promise<BeverageSectionPayload> {
  return window.electron.ipcRenderer.invoke("beverage-items:get-by-event", eventId) as Promise<BeverageSectionPayload>
}

export function createBeverageItem(data: {
  id?: string
  eventId: string
  name: string
  type: BeverageItemType
  quantity?: number
  serviceStyle?: string
  includes?: string
  unitPriceCents?: number
}): Promise<BeverageItem> {
  return window.electron.ipcRenderer.invoke("beverage-items:post", data) as Promise<BeverageItem>
}

export function createBeverageItemAssignedToTimeblock(data: {
  id?: string
  eventId: string
  name: string
  type: BeverageItemType
  timeblockId: string
  quantity?: number
  serviceStyle?: string
  includes?: string
  unitPriceCents?: number
}): Promise<BeverageItemWithAssignments> {
  return window.electron.ipcRenderer.invoke(
    "beverage-items:post-assigned",
    data,
  ) as Promise<BeverageItemWithAssignments>
}

export function updateBeverageItem(id: string, updates: {
  name?: string
  quantity?: number | null
  type?: BeverageItemType
  serviceStyle?: string | null
  includes?: string | null
  unitPriceCents?: number | null
}): Promise<BeverageItem> {
  return window.electron.ipcRenderer.invoke("beverage-items:patch", id, updates) as Promise<BeverageItem>
}

export function deleteBeverageItem(id: string): Promise<boolean> {
  return window.electron.ipcRenderer.invoke("beverage-items:delete", id) as Promise<boolean>
}

export function setBeverageItemTimeblocks(itemId: string, timeblockIds: string[]): Promise<{ itemId: string; timeblockIds: string[] }> {
  return window.electron.ipcRenderer.invoke("beverage-items:set-timeblocks", itemId, timeblockIds) as Promise<{ itemId: string; timeblockIds: string[] }>
}
