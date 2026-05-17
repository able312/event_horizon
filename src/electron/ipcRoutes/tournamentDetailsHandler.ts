import { ipcMain } from "electron"
import type { UpdateTournamentDetails } from "../../definitions/database.js"
import tournamentDetailsQueries from "../db/repository/tournamentDetails.js"
import { logAndThrow } from "./ipcErrors.js"

export const registerTournamentDetailsIpcHandlers = () => {
  ipcMain.handle("tournament-details:get-many", async () => {
    try {
      return tournamentDetailsQueries.getAll()
    } catch (err) {
      logAndThrow("Error getting tournament details:", err)
    }
  })

  ipcMain.handle("tournament-details:get-by-event-id", async (_event, id: string) => {
    try {
      return tournamentDetailsQueries.getByEventId(id)
    } catch (err) {
      logAndThrow("Error getting tournament details:", err)
    }
  })

  ipcMain.handle("tournament-details:get-or-create-by-event-id", async (_event, id: string) => {
    try {
      return tournamentDetailsQueries.getOrCreateByEventId(id)
    } catch (err) {
      logAndThrow("Error getting or creating tournament details:", err)
    }
  })

  ipcMain.handle("tournament-details:post", async (_event, eventId: string) => {
    try {
      return tournamentDetailsQueries.insert(eventId)
    } catch (err) {
      logAndThrow("Error creating tournament details:", err)
    }
  })

  ipcMain.handle("tournament-details:patch", async (_event, id: string, updates: UpdateTournamentDetails) => {
    try {
      return tournamentDetailsQueries.update(id, updates)
    } catch (err) {
      logAndThrow("Error updating tournament details:", err)
    }
  })

  ipcMain.handle("tournament-details:delete", async (_event, id: string) => {
    try {
      return tournamentDetailsQueries.delete(id)
    } catch (err) {
      logAndThrow("Error deleting tournament details:", err)
    }
  })
}
