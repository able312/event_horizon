import { db } from "../index.js"
import type { AppDatabase } from "../factory.js"
import { tournamentDetails } from "../schema.js"
import type { TournamentDetails, UpdateTournamentDetails } from "../../../definitions/database.js"
import { eq } from "drizzle-orm"
import { v4 as uuidv4 } from "uuid"

function buildTournamentDetailsEntry(eventId: string): TournamentDetails {
  const now = new Date().toISOString()

  return {
    id: uuidv4(),
    eventId,
    time: null,
    startFormat: "Shotgun",
    playFormat: "Scramble",
    numberOfPlayers: null,
    paceOfPlay: null,
    leadCarts: null,
    notes: null,
    createdAt: now,
    updatedAt: null,
  }
}

export function createTournamentDetailsRepository(database: AppDatabase) {
  const tournamentDetailsQueries = {
    getAll: (): TournamentDetails[] => {
      return database.select().from(tournamentDetails).all()
    },

    getByEventId: (eventId: string): TournamentDetails => {
      if (!eventId) throw new Error("getTournamentDetailsByEventId: eventId is required")

      const details = database.select().from(tournamentDetails).where(eq(tournamentDetails.eventId, eventId)).get()
      if (!details) throw new Error(`Tournament details not found for event ${eventId}`)

      return details
    },

    getOrCreateByEventId: (eventId: string): TournamentDetails => {
      if (!eventId) throw new Error("getOrCreateTournamentDetailsByEventId: eventId is required")

      return database.transaction((tx) => {
        const existing = tx.select().from(tournamentDetails).where(eq(tournamentDetails.eventId, eventId)).get()
        if (existing) return existing

        return tx.insert(tournamentDetails).values(buildTournamentDetailsEntry(eventId)).returning().get()!
      })
    },

    insert: (eventId: string): TournamentDetails => {
      if (!eventId) throw new Error("insertTournamentDetails: eventId is required")

      return database.insert(tournamentDetails).values(buildTournamentDetailsEntry(eventId)).returning().get()!
    },

    update: (id: string, updates: UpdateTournamentDetails): TournamentDetails => {
      if (!id) throw new Error("updateTournamentDetails: ID is required")
      if (Object.keys(updates).length === 0) {
        throw new Error("updateTournamentDetails: updates are required")
      }

      const updatedTournamentDetails = database.update(tournamentDetails)
        .set({ ...updates, updatedAt: new Date().toISOString() })
        .where(eq(tournamentDetails.id, id))
        .returning()
        .get()

      if (!updatedTournamentDetails) throw new Error(`Tournament details not found for id ${id}`)

      return updatedTournamentDetails
    },

    delete: (id: string): boolean => {
      if (!id) throw new Error("deleteTournamentDetails: ID is required")

      const deleted = database.delete(tournamentDetails).where(eq(tournamentDetails.id, id)).run().changes > 0
      if (!deleted) throw new Error(`Tournament details not found for id ${id}`)

      return true
    },
  }

  return tournamentDetailsQueries
}

export default createTournamentDetailsRepository(db)
