import type { CartDetails, UpdateCartDetails } from "~/definitions/database"

export function getOrCreateCartDetailsByEventId(eventId: string): Promise<CartDetails> {
  return window.electron.ipcRenderer.invoke("cart-details:get-or-create-by-event-id", eventId) as Promise<CartDetails>
}

export function updateCartDetails(id: string, updates: UpdateCartDetails): Promise<CartDetails> {
  return window.electron.ipcRenderer.invoke("cart-details:patch", id, updates) as Promise<CartDetails>
}
