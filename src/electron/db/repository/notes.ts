import { db } from "../index.js"
import type { AppDatabase } from "../factory.js"
import { notes, timeblocks } from "../schema.js"
import { eq, and } from "drizzle-orm"
import { v4 as uuidv4 } from "uuid"
import type { UpdateNote } from "../../../definitions/database.js"

type NotesRepositoryOptions = {
  onAfterTimeblockInsert?: () => void
}

export function createNotesRepository(database: AppDatabase, options: NotesRepositoryOptions = {}) {
  const { onAfterTimeblockInsert } = options

  const notesQueries = {
    create: (eventId: string) => {
      if (!eventId) throw new Error("createNote: eventId is required")

      return database.transaction((tx) => {
        const now = new Date().toISOString()
        const timeblockId = uuidv4()

        const newTimeblock = tx.insert(timeblocks).values({
          id: timeblockId,
          eventId: eventId,
          title: "",
          time: "",
          sectionType: "note",
          createdAt: now,
        }).returning().get()!

        onAfterTimeblockInsert?.()

        const newNote = tx.insert(notes).values({
          id: uuidv4(),
          timeblockId,
          content: "",
          createdAt: now,
          updatedAt: now,
        }).returning().get()!

        return { timeblock: newTimeblock, note: newNote }
      })
    },

    update: (id: string, updates: UpdateNote) => {
      if (!id) throw new Error("notesQueries.update: noteId is required")
      if (Object.keys(updates).length === 0) {
        throw new Error("notesQueries.update: updates are required")
      }

      const updatedNote = database.update(notes)
        .set({ ...updates })
        .where(eq(notes.id, id))
        .returning()
        .get()

      if (!updatedNote) throw new Error(`Note not found for id ${id}`)

      return updatedNote
    },

    delete: (timeblockId: string): boolean => {
      if (!timeblockId) throw new Error("deleteNote: timeblockId is required")

      const deleted = database.delete(timeblocks).where(eq(timeblocks.id, timeblockId)).run().changes > 0
      if (!deleted) throw new Error(`Note timeblock not found for id ${timeblockId}`)

      return true
    },

    getByEventId: async (eventId: string) => {
      if (!eventId) throw new Error("getNotesByEventId: eventId is required")

      const noteTimeblocks = await database.query.timeblocks.findMany({
        where: and(
          eq(timeblocks.eventId, eventId),
          eq(timeblocks.sectionType, "note")
        ),
        with: {
          note: true,
        }
      })

      return noteTimeblocks
    },
  }

  return notesQueries
}

export default createNotesRepository(db)
