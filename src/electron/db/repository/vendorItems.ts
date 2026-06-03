import { db } from "../index.js"
import type { AppDatabase } from "../factory.js"
import { vendorItems, timeblocks } from "../schema.js"
import { eq, and } from "drizzle-orm"
import { v4 as uuidv4 } from "uuid"
import type { UpdateVendorItem } from "../../../definitions/database.js"

type VendorItemsRepositoryOptions = {
  onAfterTimeblockInsert?: () => void
}

export function createVendorItemsRepository(database: AppDatabase, options: VendorItemsRepositoryOptions = {}) {
  const { onAfterTimeblockInsert } = options

  const vendorItemQueries = {
    create: (eventId: string) => {
      if (!eventId) throw new Error("createVendor: eventId is required")

      return database.transaction((tx) => {
        const timeblockId = uuidv4()
        const now = new Date().toISOString()

        const newTimeblock = tx.insert(timeblocks).values({
          id: timeblockId,
          eventId: eventId,
          title: "",
          time: "",
          sectionType: "vendor",
          createdAt: now,
        }).returning().get()!

        onAfterTimeblockInsert?.()

        const newVendor = tx.insert(vendorItems).values({
          id: uuidv4(),
          timeblockId,
          contactName: "",
          contactPhone: "",
          contactEmail: "",
        }).returning().get()!

        return { timeblock: newTimeblock, vendor: newVendor }
      })
    },

    update: (id: string, updates: UpdateVendorItem) => {
      if (!id) throw new Error("updateVendor: vendorId is required")
      if (Object.keys(updates).length === 0) {
        throw new Error("updateVendor: updates are required")
      }

      const updatedVendor = database.update(vendorItems)
        .set({ ...updates })
        .where(eq(vendorItems.id, id))
        .returning()
        .get()

      if (!updatedVendor) throw new Error(`Vendor item not found for id ${id}`)

      return updatedVendor
    },

    delete: (timeblockId: string): boolean => {
      if (!timeblockId) throw new Error("deleteVendor: timeblockId is required")

      const deleted = database.delete(timeblocks).where(eq(timeblocks.id, timeblockId)).run().changes > 0
      if (!deleted) throw new Error(`Vendor timeblock not found for id ${timeblockId}`)

      return true
    },

    getByEventId: async (eventId: string) => {
      if (!eventId) throw new Error("getVendorsByEventId: eventId is required")

      const vendorTimeblocks = await database.query.timeblocks.findMany({
        where: and(
          eq(timeblocks.eventId, eventId),
          eq(timeblocks.sectionType, "vendor")
        ),
        with: {
          vendorItem: true,
        }
      })

      return vendorTimeblocks
    },
  }

  return vendorItemQueries
}

export default createVendorItemsRepository(db)
