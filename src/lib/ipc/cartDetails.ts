import type { CartDetails, UpdateCartDetails } from "~/definitions/database"

export function getCartDetails(): Promise<CartDetails[]> {
  return window.electron.ipcRenderer.invoke("cart-details:get-many") as Promise<CartDetails[]>
}

export function getCartDetailsByEventId(eventId: string): Promise<CartDetails> {
  return window.electron.ipcRenderer.invoke("cart-details:get-by-event-id", eventId) as Promise<CartDetails>
}

export function getOrCreateCartDetailsByEventId(eventId: string): Promise<CartDetails> {
  return window.electron.ipcRenderer.invoke("cart-details:get-or-create-by-event-id", eventId) as Promise<CartDetails>
}

export function createCartDetails(eventId: string): Promise<CartDetails> {
  return window.electron.ipcRenderer.invoke("cart-details:post", eventId) as Promise<CartDetails>
}

export function updateCartDetails(id: string, updates: UpdateCartDetails): Promise<CartDetails> {
  return window.electron.ipcRenderer.invoke("cart-details:patch", id, updates) as Promise<CartDetails>
}

export function deleteCartDetails(id: string): Promise<boolean> {
  return window.electron.ipcRenderer.invoke("cart-details:delete", id) as Promise<boolean>
}
