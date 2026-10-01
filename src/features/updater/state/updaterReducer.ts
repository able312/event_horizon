// src/features/updater/state/updaterReducer.ts

export type UpdaterStatus =
  | { phase: "idle" }
  | { phase: "checking" }
  | { phase: "downloading"; version: string; percent: number }
  // Download finished but the update is not yet installable (no progress is reported here).
  | { phase: "preparing"; version: string }
  | { phase: "ready"; version: string }
  | { phase: "error"; message: string }

export type UpdaterPhase = UpdaterStatus["phase"]

export interface UpdaterState {
  status: UpdaterStatus
  // True once the "update ready" bounce has played for the current ready version.
  readyAnnounced: boolean
}

export const ACTIONS = {
  STATUS_CHANGED: "STATUS_CHANGED",
  READY_ANNOUNCED: "READY_ANNOUNCED",
} as const

export type UpdaterAction =
  | { type: "STATUS_CHANGED"; status: UpdaterStatus }
  | { type: "READY_ANNOUNCED" }

export const initialUpdaterState: UpdaterState = {
  status: { phase: "idle" },
  readyAnnounced: false,
}

export function clampPercent(percent: number): number {
  if (!Number.isFinite(percent)) return 0
  return Math.min(100, Math.max(0, percent))
}

function normalizeStatus(status: UpdaterStatus): UpdaterStatus {
  if (status.phase !== "downloading") return status
  return { ...status, percent: clampPercent(status.percent) }
}

function isSameReadyVersion(previous: UpdaterStatus, next: UpdaterStatus): boolean {
  return previous.phase === "ready" && next.phase === "ready" && previous.version === next.version
}

export function shouldAnnounceReady(state: UpdaterState, isWindowFocused: boolean): boolean {
  return state.status.phase === "ready" && !state.readyAnnounced && isWindowFocused
}

export function updaterReducer(state: UpdaterState, action: UpdaterAction): UpdaterState {
  switch (action.type) {
    case ACTIONS.STATUS_CHANGED: {
      const status = normalizeStatus(action.status)
      return {
        status,
        readyAnnounced: state.readyAnnounced && isSameReadyVersion(state.status, status),
      }
    }
    case ACTIONS.READY_ANNOUNCED: {
      if (state.status.phase !== "ready" || state.readyAnnounced) return state
      return { ...state, readyAnnounced: true }
    }
    default:
      return state
  }
}
