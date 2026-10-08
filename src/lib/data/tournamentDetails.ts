import type { TournamentDetails, UpdateTournamentDetails } from "~/definitions/database"

export function getTournamentDetails(): Promise<TournamentDetails[]> {
  return window.electron.ipcRenderer.invoke("tournament-details:get-many") as Promise<TournamentDetails[]>
}

export function getTournamentDetailsByEventId(eventId: string): Promise<TournamentDetails> {
  return window.electron.ipcRenderer.invoke("tournament-details:get-by-event-id", eventId) as Promise<TournamentDetails>
}

export function getOrCreateTournamentDetailsByEventId(eventId: string): Promise<TournamentDetails> {
  return window.electron.ipcRenderer.invoke("tournament-details:get-or-create-by-event-id", eventId) as Promise<TournamentDetails>
}

export function createTournamentDetails(eventId: string): Promise<TournamentDetails> {
  return window.electron.ipcRenderer.invoke("tournament-details:post", eventId) as Promise<TournamentDetails>
}

export function updateTournamentDetails(id: string, updates: UpdateTournamentDetails): Promise<TournamentDetails> {
  return window.electron.ipcRenderer.invoke("tournament-details:patch", id, updates) as Promise<TournamentDetails>
}

export function deleteTournamentDetails(id: string): Promise<boolean> {
  return window.electron.ipcRenderer.invoke("tournament-details:delete", id) as Promise<boolean>
}
