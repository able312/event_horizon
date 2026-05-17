import { db } from "../index.js"
import type { AppDatabase } from "../factory.js"
import { cartDetails } from "../schema.js"
import type { CartDetails, UpdateCartDetails } from "../../../definitions/database.js"
import { eq } from "drizzle-orm"
import { v4 as uuidv4 } from "uuid"

function buildCartDetailsEntry(eventId: string): CartDetails {
  const now = new Date().toISOString()

  return {
    id: uuidv4(),
    eventId,
    time: null,
    layout: "template-12-hole-shotgun",
    customGrid: null,
    whatGoesOnCarts: null,
    assignedTo: null,
    rentingCarts: false,
    createdAt: now,
    updatedAt: null,
  }
}

export function createCartDetailsRepository(database: AppDatabase) {
  const cartDetailsQueries = {
    getAll: (): CartDetails[] => {
      return database.select().from(cartDetails).all()
    },

    getByEventId: (eventId: string): CartDetails => {
      if (!eventId) throw new Error("getCartDetailsByEventId: eventId is required")

      const details = database.select().from(cartDetails).where(eq(cartDetails.eventId, eventId)).get()
      if (!details) throw new Error(`Cart details not found for event ${eventId}`)

      return details
    },

    getOrCreateByEventId: (eventId: string): CartDetails => {
      if (!eventId) throw new Error("getOrCreateCartDetailsByEventId: eventId is required")

      return database.transaction((tx) => {
        const existing = tx.select().from(cartDetails).where(eq(cartDetails.eventId, eventId)).get()
        if (existing) return existing

        return tx.insert(cartDetails).values(buildCartDetailsEntry(eventId)).returning().get()!
      })
    },

    insert: (eventId: string): CartDetails => {
      if (!eventId) throw new Error("insertCartDetails: eventId is required")

      return database.insert(cartDetails).values(buildCartDetailsEntry(eventId)).returning().get()!
    },

    update: (id: string, updates: UpdateCartDetails): CartDetails => {
      if (!id) throw new Error("updateCartDetails: ID is required")
      if (Object.keys(updates).length === 0) {
        throw new Error("updateCartDetails: updates are required")
      }

      const updatedCartDetails = database.update(cartDetails)
        .set({ ...updates, updatedAt: new Date().toISOString() })
        .where(eq(cartDetails.id, id))
        .returning()
        .get()

      if (!updatedCartDetails) throw new Error(`Cart details not found for id ${id}`)

      return updatedCartDetails
    },

    delete: (id: string): boolean => {
      if (!id) throw new Error("deleteCartDetails: ID is required")

      const deleted = database.delete(cartDetails).where(eq(cartDetails.id, id)).run().changes > 0
      if (!deleted) throw new Error(`Cart details not found for id ${id}`)

      return true
    },
  }

  return cartDetailsQueries
}

export default createCartDetailsRepository(db)
