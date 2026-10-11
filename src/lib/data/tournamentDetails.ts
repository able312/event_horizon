import type { TournamentDetails, UpdateTournamentDetails } from "~/definitions/database"
import { api } from "../../../convex/_generated/api"
import { pickFields, runMutation } from "./backend"
import { toId } from "./ids"

/**
 * Creates the event's tournament details if they don't exist yet, then returns them.
 * Reads can't write in Convex, so this is an explicit, idempotent mutation; the
 * cached read then follows `tournamentDetails.getByEventId` live (see queries.ts).
 */
export function getOrCreateTournamentDetailsByEventId(eventId: string): Promise<TournamentDetails> {
  return runMutation(api.tournamentDetails.ensureByEventId, { eventId: toId<"events">(eventId) })
}

export function updateTournamentDetails(id: string, updates: UpdateTournamentDetails): Promise<TournamentDetails> {
  return runMutation(api.tournamentDetails.update, {
    id: toId<"tournamentDetails">(id),
    updates: pickFields(updates, ["time", "startFormat", "playFormat", "numberOfPlayers", "paceOfPlay", "leadCarts", "notes"]),
  })
}
