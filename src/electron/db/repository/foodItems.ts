import type { NewFoodItem, UpdateFoodItem } from "~/definitions/database.js"
import { db } from "../index.js"
import { foodItems, timeblocks } from "../schema.js"
import { eq, and } from "drizzle-orm"
import { v4 as uuidv4 } from "uuid"

const foodItemQueries = {
  insert: (data: NewFoodItem) => {
    if (!data.timeblockId) throw new Error("insertFoodItem: timeblockId is required")

    return db.insert(foodItems).values({
      id: uuidv4(),
      timeblockId: data.timeblockId,
      name: data.name,
      quantity: data.quantity ?? null,
      serviceStyle: data.serviceStyle ?? null,
      includes: data.includes ?? null,
      unitPriceCents: data.unitPriceCents ?? null,
    }).returning().get()!
  },

  update: (id: string, updates: UpdateFoodItem) => {
    if (!id) throw new Error("updateFoodItem: ID is required")
    if (Object.keys(updates).length === 0) {
      throw new Error("updateFoodItem: updates are required")
    }

    const updatedFoodItem = db.update(foodItems)
      .set(updates)
      .where(eq(foodItems.id, id))
      .returning()
      .get()

    if (!updatedFoodItem) throw new Error(`Food item not found for id ${id}`)

    return updatedFoodItem
  },

  delete: (id: string): boolean => {
    if (!id) throw new Error("deleteFoodItem: ID is required")

    const deleted = db.delete(foodItems).where(eq(foodItems.id, id)).run().changes > 0
    if (!deleted) throw new Error(`Food item not found for id ${id}`)

    return true
  },

  getByEventId: async (eventId: string) => {
    if (!eventId) throw new Error("getFoodItemsByEventId: eventId is required")

    const foodTimeblocks = await db.query.timeblocks.findMany({
      where: and(
        eq(timeblocks.eventId, eventId),
        eq(timeblocks.sectionType, 'food')
      ),
      with: {
        foodItems: true,
      },
    })

    const allFoodItems = await db.select().from(foodItems).all()

    const groupItems = (tbId: string) =>
      allFoodItems.filter(i => i.timeblockId === tbId)

    return foodTimeblocks.map(tb => ({ ...tb, items: groupItems(tb.id) }))
  },
}

export default foodItemQueries
