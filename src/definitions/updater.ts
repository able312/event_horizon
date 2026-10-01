export type UpdaterStatus =
  | { phase: "idle" }
  | { phase: "checking" }
  | { phase: "downloading"; version: string; percent: number }
  | { phase: "preparing"; version: string }
  | { phase: "ready"; version: string }
  | { phase: "error"; message: string }

export interface UpdaterSnapshot {
  revision: number
  status: UpdaterStatus
}

export interface UpdaterApi {
  getStatus: () => Promise<UpdaterSnapshot>
  onStatusChanged: (listener: (snapshot: UpdaterSnapshot) => void) => () => void
  restartAndInstall: () => Promise<void>
}
