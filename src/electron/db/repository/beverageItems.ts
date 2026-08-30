import type { BeverageItemType, NewBeverageItem, UpdateBeverageItem } from "~/definitions/database.js"
import type { BeverageItemWithAssignments, BeverageSectionPayload } from "~/definitions/beverage/beverage-types.js"
import { db } from "../index.js"
import type { AppDatabase } from "../factory.js"
import { beverageItemTimeblocks, beverageItems, timeblocks } from "../schema.js"
import { eq, and, inArray } from "drizzle-orm"
import { v4 as uuidv4 } from "uuid"

const VALID_BEVERAGE_TYPES = new Set<string>([
  "Special Orders",
  "Beer",
  "Wine",
  "Coolers",
  "Rails",
  "Non-Alcoholic",
])

function mapAssignmentsByItemId(
  rows: Array<{ beverageItemId: string; timeblockId: string }>,
): Map<string, string[]> {
  const assignments = new Map<string, string[]>()

  for (const row of rows) {
    const current = assignments.get(row.beverageItemId) ?? []
    current.push(row.timeblockId)
    assignments.set(row.beverageItemId, current)
  }

  return assignments
}

export function createBeverageItemsRepository(database: AppDatabase) {
  return {
    insert: (data: NewBeverageItem) => {
      if (!data.eventId) throw new Error("insertBeverageItem: eventId is required")
      if (!data.type) throw new Error("insertBeverageItem: type is required")

      const id = data.id?.trim() ? data.id : uuidv4()

      return database.insert(beverageItems).values({
        id,
        eventId: data.eventId,
        name: data.name,
        quantity: data.quantity ?? null,
        type: data.type,
        serviceStyle: data.serviceStyle ?? null,
        includes: data.includes ?? null,
        unitPriceCents: data.unitPriceCents ?? null,
      }).returning().get()!
    },

    /**
     * Atomically create a beverage item and assign it to a beverage timeblock.
     * Returns the item with its initial assignment list.
     */
    insertAssignedToTimeblock: (data: NewBeverageItem & { timeblockId: string }): BeverageItemWithAssignments => {
      if (!data.eventId) throw new Error("insertAssignedToTimeblock: eventId is required")
      if (!data.type) throw new Error("insertAssignedToTimeblock: type is required")
      if (!data.timeblockId) throw new Error("insertAssignedToTimeblock: timeblockId is required")

      const timeblock = database.select()
        .from(timeblocks)
        .where(and(
          eq(timeblocks.id, data.timeblockId),
          eq(timeblocks.eventId, data.eventId),
          eq(timeblocks.sectionType, "beverage"),
        ))
        .get()

      if (!timeblock) {
        throw new Error("insertAssignedToTimeblock: timeblock is invalid for this event")
      }

      const id = data.id?.trim() ? data.id : uuidv4()

      return database.transaction((tx) => {
        const created = tx.insert(beverageItems).values({
          id,
          eventId: data.eventId,
          name: data.name,
          quantity: data.quantity ?? null,
          type: data.type,
          serviceStyle: data.serviceStyle ?? null,
          includes: data.includes ?? null,
          unitPriceCents: data.unitPriceCents ?? null,
        }).returning().get()!

        tx.insert(beverageItemTimeblocks).values({
          beverageItemId: created.id,
          timeblockId: data.timeblockId,
        }).run()

        return {
          ...created,
          assignedTimeblockIds: [data.timeblockId],
        }
      })
    },

    update: (id: string, updates: UpdateBeverageItem) => {
      if (!id) throw new Error("updateBeverageItem: ID is required")
      if (Object.keys(updates).length === 0) {
        throw new Error("updateBeverageItem: updates are required")
      }

      const updatedBeverageItem = database.update(beverageItems)
        .set(updates)
        .where(eq(beverageItems.id, id))
        .returning()
        .get()

      if (!updatedBeverageItem) throw new Error(`Beverage item not found for id ${id}`)

      return updatedBeverageItem
    },

    delete: (id: string): boolean => {
      if (!id) throw new Error("deleteBeverageItem: ID is required")

      const deleted = database.delete(beverageItems).where(eq(beverageItems.id, id)).run().changes > 0
      if (!deleted) throw new Error(`Beverage item not found for id ${id}`)

      return true
    },

    setItemTimeblocks: (itemId: string, timeblockIds: string[]) => {
      if (!itemId) throw new Error("setItemTimeblocks: itemId is required")

      const item = database.select().from(beverageItems).where(eq(beverageItems.id, itemId)).get()
      if (!item) throw new Error(`Beverage item not found for id ${itemId}`)

      if (timeblockIds.length > 0) {
        const validTimeblocks = database.select({ id: timeblocks.id })
          .from(timeblocks)
          .where(and(
            eq(timeblocks.eventId, item.eventId),
            eq(timeblocks.sectionType, "beverage"),
            inArray(timeblocks.id, timeblockIds),
          ))
          .all()

        if (validTimeblocks.length !== timeblockIds.length) {
          throw new Error("setItemTimeblocks: one or more timeblock ids are invalid for this event")
        }
      }

      database.transaction((tx) => {
        tx.delete(beverageItemTimeblocks).where(eq(beverageItemTimeblocks.beverageItemId, itemId)).run()

        for (const timeblockId of timeblockIds) {
          tx.insert(beverageItemTimeblocks).values({
            beverageItemId: itemId,
            timeblockId,
          }).run()
        }
      })

      return { itemId, timeblockIds }
    },

    getByEventId: async (eventId: string): Promise<BeverageSectionPayload> => {
      if (!eventId) throw new Error("getBeverageItemsByEventId: eventId is required")

      const [beverageTimeblocks, eventItems] = await Promise.all([
        database.query.timeblocks.findMany({
          where: and(
            eq(timeblocks.eventId, eventId),
            eq(timeblocks.sectionType, "beverage"),
          ),
        }),
        database.query.beverageItems.findMany({
          where: eq(beverageItems.eventId, eventId),
        }),
      ])

      const itemIds = eventItems.map((item) => item.id)
      const assignmentRows = itemIds.length === 0
        ? []
        : database.select({
          beverageItemId: beverageItemTimeblocks.beverageItemId,
          timeblockId: beverageItemTimeblocks.timeblockId,
        })
          .from(beverageItemTimeblocks)
          .where(inArray(beverageItemTimeblocks.beverageItemId, itemIds))
          .all()

      const assignmentsByItemId = mapAssignmentsByItemId(assignmentRows)

      const items: BeverageItemWithAssignments[] = eventItems.map((item) => ({
        ...item,
        assignedTimeblockIds: assignmentsByItemId.get(item.id) ?? [],
      }))

      return {
        timeblocks: beverageTimeblocks,
        items,
      }
    },
  }
}

export function normalizeBeverageItemType(type: string | null | undefined): BeverageItemType {
  if (type && VALID_BEVERAGE_TYPES.has(type)) {
    return type as BeverageItemType
  }

  return "Special Orders"
}

export default createBeverageItemsRepository(db)
