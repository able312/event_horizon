import { ACTIONS, type UpdaterAction, type UpdaterStatus } from "../state/updaterReducer"

// Dev-only stand-in for the main-process updater. Timers live at module level so a
// simulated download keeps running while the sidebar remounts between routes.

const SIMULATED_VERSION = "0.0.2"
const DOWNLOAD_TICK_MS = 250
const DOWNLOAD_STEP_PERCENT = 4
const PREPARING_MS = 2000

type Dispatch = (action: UpdaterAction) => void

let timer: ReturnType<typeof setTimeout> | null = null

function stopSimulation() {
  if (timer !== null) clearTimeout(timer)
  timer = null
}

export function setSimulatedStatus(dispatch: Dispatch, status: UpdaterStatus) {
  stopSimulation()
  dispatch({ type: ACTIONS.STATUS_CHANGED, status })
}

export function runSimulatedDownload(dispatch: Dispatch) {
  stopSimulation()

  const tick = (percent: number) => {
    if (percent < 100) {
      dispatch({
        type: ACTIONS.STATUS_CHANGED,
        status: { phase: "downloading", version: SIMULATED_VERSION, percent },
      })
      timer = setTimeout(() => tick(percent + DOWNLOAD_STEP_PERCENT), DOWNLOAD_TICK_MS)
      return
    }

    dispatch({
      type: ACTIONS.STATUS_CHANGED,
      status: { phase: "preparing", version: SIMULATED_VERSION },
    })
    timer = setTimeout(() => {
      timer = null
      dispatch({
        type: ACTIONS.STATUS_CHANGED,
        status: { phase: "ready", version: SIMULATED_VERSION },
      })
    }, PREPARING_MS)
  }

  tick(0)
}

export const SIMULATED_STATUSES: { label: string; status: UpdaterStatus }[] = [
  { label: "Idle", status: { phase: "idle" } },
  { label: "Checking", status: { phase: "checking" } },
  { label: "Downloading 42%", status: { phase: "downloading", version: SIMULATED_VERSION, percent: 42 } },
  { label: "Preparing", status: { phase: "preparing", version: SIMULATED_VERSION } },
  { label: "Ready", status: { phase: "ready", version: SIMULATED_VERSION } },
  { label: "Error", status: { phase: "error", message: "Could not download the update." } },
]
