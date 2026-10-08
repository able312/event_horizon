import type { TournamentDetails, UpdateTournamentDetails } from "~/definitions/database"

export function getOrCreateTournamentDetailsByEventId(eventId: string): Promise<TournamentDetails> {
  return window.electron.ipcRenderer.invoke("tournament-details:get-or-create-by-event-id", eventId) as Promise<TournamentDetails>
}

export function updateTournamentDetails(id: string, updates: UpdateTournamentDetails): Promise<TournamentDetails> {
  return window.electron.ipcRenderer.invoke("tournament-details:patch", id, updates) as Promise<TournamentDetails>
}
