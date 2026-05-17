import { db } from "../index.js"
import { payments } from "../schema.js"
import type { Payment, NewPayment, UpdatePayment } from "../../../definitions/database.js"
import { eq } from "drizzle-orm"
import { v4 as uuidv4 } from "uuid"

const paymentQueries = {
  getAll: (): Payment[] => {
    return db.select().from(payments).all()
  },

  getByEventId: (eventId: string): Payment => {
    if (!eventId) throw new Error("getPaymentByEventId: eventId is required")

    const payment = db.select().from(payments).where(eq(payments.eventId, eventId)).get()
    if (!payment) throw new Error(`Payment not found for event ${eventId}`)

    return payment
  },

  insert: (eventId: string): Payment => {
    if (!eventId) throw new Error("insertPayment: eventId is required")

    const now = new Date().toISOString()
    const paymentEntry: NewPayment = {
      id: uuidv4(),
      eventId: eventId,
      amountCents: 0,
      date: now, // ISO date string
      recieptNumber: "",
      notes: "",
      createdAt: now,
    }

    return db.insert(payments).values(paymentEntry).returning().get()!
  },

  update: (id: string, updates: UpdatePayment): Payment => {
    if (!id) throw new Error("updatePayment: ID is required")
    if (Object.keys(updates).length === 0) {
      throw new Error("updatePayment: updates are required")
    }

    const updatedPayment = db.update(payments)
      .set({ ...updates })
      .where(eq(payments.id, id))
      .returning()
      .get()

    if (!updatedPayment) throw new Error(`Payment not found for id ${id}`)

    return updatedPayment
  },

  delete: (id: string): boolean => {
    if (!id) throw new Error("deletePayment: ID is required")

    const deleted = db.delete(payments).where(eq(payments.id, id)).run().changes > 0
    if (!deleted) throw new Error(`Payment not found for id ${id}`)

    return true
  },
}

export default paymentQueries
