import type { NewBeverageItem, UpdateBeverageItem } from "~/definitions/database.js"
import { db } from "../index.js"
import { beverageItems, timeblocks } from "../schema.js"
import { eq, and } from "drizzle-orm"
import { v4 as uuidv4 } from "uuid"

const beverageItemQueries = {
  insert: (data: NewBeverageItem) => {
    if (!data.timeblockId) throw new Error("insertBeverageItem: timeblockId is required")

    return db.insert(beverageItems).values({
      id: uuidv4(),
      timeblockId: data.timeblockId,
      name: data.name,
      quantity: data.quantity ?? null,
      type: data.type ?? null,
      serviceStyle: data.serviceStyle ?? null,
      includes: data.includes ?? null,
      unitPriceCents: data.unitPriceCents ?? null,
    }).returning().get()!
  },

  update: (id: string, updates: UpdateBeverageItem) => {
    if (!id) throw new Error("updateBeverageItem: ID is required")
    if (Object.keys(updates).length === 0) {
      throw new Error("updateBeverageItem: updates are required")
    }

    const updatedBeverageItem = db.update(beverageItems)
      .set(updates)
      .where(eq(beverageItems.id, id))
      .returning()
      .get()

    if (!updatedBeverageItem) throw new Error(`Beverage item not found for id ${id}`)

    return updatedBeverageItem
  },

  delete: (id: string): boolean => {
    if (!id) throw new Error("deleteBeverageItem: ID is required")

    const deleted = db.delete(beverageItems).where(eq(beverageItems.id, id)).run().changes > 0
    if (!deleted) throw new Error(`Beverage item not found for id ${id}`)

    return true
  },

  getByEventId: async (eventId: string) => {
    if (!eventId) throw new Error("getBeverageItemsByEventId: eventId is required")

    const beverageTimeblocks = await db.query.timeblocks.findMany({
      where: and(
        eq(timeblocks.eventId, eventId),
        eq(timeblocks.sectionType, 'beverage')
      ),
      with: {
        beverageItems: true,
      },
    })

    return beverageTimeblocks
  },
}

export default beverageItemQueries
