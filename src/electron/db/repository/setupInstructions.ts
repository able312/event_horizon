import { db } from "../index.js"
import type { AppDatabase } from "../factory.js"
import { setupInstructions, timeblocks } from "../schema.js"
import { eq, and } from "drizzle-orm"
import { v4 as uuidv4 } from "uuid"
import type { UpdateSetupInstruction } from "../../../definitions/database.js"

type SetupInstructionsRepositoryOptions = {
  onAfterTimeblockInsert?: () => void
}

export function createSetupInstructionsRepository(database: AppDatabase, options: SetupInstructionsRepositoryOptions = {}) {
  const { onAfterTimeblockInsert } = options

  const setupInstructionsQueries = {
    create: (eventId: string) => {
      if (!eventId) throw new Error("createSetupInstruction: eventId is required")

      return database.transaction((tx) => {
        const now = new Date().toISOString()
        const timeblockId = uuidv4()

        const newTimeblock = tx.insert(timeblocks).values({
          id: timeblockId,
          eventId: eventId,
          title: "",
          time: "",
          sectionType: "setup_instruction",
          createdAt: now,
        }).returning().get()!

        onAfterTimeblockInsert?.()

        const newSetupInstruction = tx.insert(setupInstructions).values({
          id: uuidv4(),
          timeblockId,
          instruction: "",
          createdAt: now,
          updatedAt: now,
        }).returning().get()!

        return { timeblock: newTimeblock, setupInstruction: newSetupInstruction }
      })
    },

    update: (id: string, updates: UpdateSetupInstruction) => {
      if (!id) throw new Error("setupInstructionsQueries.update: setupInstructionId is required")
      if (Object.keys(updates).length === 0) {
        throw new Error("setupInstructionsQueries.update: updates are required")
      }

      const updatedSetupInstruction = database.update(setupInstructions)
        .set({ ...updates })
        .where(eq(setupInstructions.id, id))
        .returning()
        .get()

      if (!updatedSetupInstruction) throw new Error(`Setup instruction not found for id ${id}`)

      return updatedSetupInstruction
    },

    delete: (timeblockId: string): boolean => {
      if (!timeblockId) throw new Error("deleteSetupInstruction: timeblockId is required")

      const deleted = database.delete(timeblocks).where(eq(timeblocks.id, timeblockId)).run().changes > 0
      if (!deleted) throw new Error(`Setup instruction timeblock not found for id ${timeblockId}`)

      return true
    },

    getByEventId: async (eventId: string) => {
      if (!eventId) throw new Error("getSetupInstructionsByEventId: eventId is required")

      const setupInstructionTimeblocks = await database.query.timeblocks.findMany({
        where: and(
          eq(timeblocks.eventId, eventId),
          eq(timeblocks.sectionType, "setup_instruction")
        ),
        with: {
          setupInstruction: true,
        }
      })

      return setupInstructionTimeblocks
    },
  }

  return setupInstructionsQueries
}

export default createSetupInstructionsRepository(db)
