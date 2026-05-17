import { db } from "../index.js"
import { menuOfChargeItems } from "../schema.js"
import type { ChargeCategory, MenuOfChargeItem, UpdateMenuOfChargeItem } from "../../../definitions/database.js"
import { eq } from "drizzle-orm"
import { v4 as uuidv4 } from "uuid"

const menuOfChargeItemQueries = {
  getAll: (): MenuOfChargeItem[] => {
    return db.select().from(menuOfChargeItems).all()
  },

  getByEventId: (eventId: string): MenuOfChargeItem[] => {
    if (!eventId) throw new Error("getMenuOfChargeItemsByEventId: eventId is required")

    return db.select().from(menuOfChargeItems).where(eq(menuOfChargeItems.eventId, eventId)).all()
  },

  insert: (eventId: string, category: ChargeCategory | null = null): MenuOfChargeItem => {
    if (!eventId) throw new Error("insertMenuOfChargeItem: eventId is required")

    const now = new Date().toISOString()
    const menuOfChargeItemEntry: MenuOfChargeItem = {
      id: uuidv4(),
      eventId: eventId,
      name: "",
      quantity: 0,
      category,
      includes: "",
      unitPriceCents: 0,
      createdAt: now,
    }

    return db.insert(menuOfChargeItems).values(menuOfChargeItemEntry).returning().get()!
  },

  update: (id: string, updates: UpdateMenuOfChargeItem): MenuOfChargeItem => {
    if (!id) throw new Error("updateMenuOfChargeItem: ID is required")
    if (Object.keys(updates).length === 0) {
      throw new Error("updateMenuOfChargeItem: updates are required")
    }

    const updatedMenuOfChargeItem = db.update(menuOfChargeItems)
      .set({ ...updates })
      .where(eq(menuOfChargeItems.id, id))
      .returning()
      .get()

    if (!updatedMenuOfChargeItem) throw new Error(`Menu of charge item not found for id ${id}`)

    return updatedMenuOfChargeItem
  },

  delete: (id: string): boolean => {
    if (!id) throw new Error("deleteMenuOfChargeItem: ID is required")

    const deleted = db.delete(menuOfChargeItems).where(eq(menuOfChargeItems.id, id)).run().changes > 0
    if (!deleted) throw new Error(`Menu of charge item not found for id ${id}`)

    return true
  },
}

export default menuOfChargeItemQueries
