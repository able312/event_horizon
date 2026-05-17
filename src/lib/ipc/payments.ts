import type { Payment, UpdatePayment } from "~/definitions/database"

export function getAllPayments(): Promise<Payment[]> {
  return window.electron.ipcRenderer.invoke("payments:get-many") as Promise<Payment[]>
}

export function getPaymentsByEventId(eventId: string): Promise<Payment> {
  return window.electron.ipcRenderer.invoke("payments:get-many-by-event-id", eventId) as Promise<Payment>
}

export function createPayment(eventId: string): Promise<Payment> {
  return window.electron.ipcRenderer.invoke("payments:post", eventId) as Promise<Payment>
}

export function updatePayment(id: string, updates: UpdatePayment): Promise<Payment> {
  return window.electron.ipcRenderer.invoke("payments:patch", id, updates) as Promise<Payment>
}

export function deletePayment(id: string): Promise<boolean> {
  return window.electron.ipcRenderer.invoke("payments:delete", id) as Promise<boolean>
}
