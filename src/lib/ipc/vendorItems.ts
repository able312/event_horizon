import type { UpdateVendorItem, VendorItem, Timeblock } from "~/definitions/database"
import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types";

export function getVendorsByEvent(eventId: string): Promise<TimeblockWithItems[]> {
  return window.electron.ipcRenderer.invoke("vendor-items:get-by-event", eventId) as Promise<TimeblockWithItems[]>
}

export function createVendor(eventId: string): Promise<{ timeblock: Timeblock; vendor: VendorItem }> {
  return window.electron.ipcRenderer.invoke("vendor-items:post", eventId) as Promise<{ timeblock: Timeblock; vendor: VendorItem }>
}

export function updateVendor(id: string, data: UpdateVendorItem): Promise<VendorItem> {
  return window.electron.ipcRenderer.invoke("vendor-items:patch", id, data ) as Promise<VendorItem>
}

export function deleteVendor(timeblockId: string): Promise<boolean> {
  return window.electron.ipcRenderer.invoke("vendor-items:delete", timeblockId) as Promise<boolean>
}
