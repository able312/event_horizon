import type { Payment, UpdatePayment } from "~/definitions/database"
import { api } from "../../../convex/_generated/api"
import { fetchSource, pickFields, runMutation } from "./backend"
import { toId } from "./ids"
import { sources } from "./sources"

export function getPaymentsByEventId(eventId: string): Promise<Payment[]> {
  return fetchSource(sources.payments.byEvent(eventId))
}

export function createPayment(eventId: string): Promise<Payment> {
  return runMutation(api.payments.create, { eventId: toId<"events">(eventId) })
}

export function updatePayment(id: string, updates: UpdatePayment): Promise<Payment> {
  return runMutation(api.payments.update, {
    id: toId<"payments">(id),
    updates: pickFields(updates, ["amountCents", "date", "recieptNumber", "notes"]),
  })
}

export function deletePayment(id: string): Promise<boolean> {
  return runMutation(api.payments.remove, { id: toId<"payments">(id) })
}
