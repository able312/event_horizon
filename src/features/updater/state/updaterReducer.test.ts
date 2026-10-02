import { describe, expect, it } from "vitest"

import {
  ACTIONS,
  clampPercent,
  initialUpdaterState,
  shouldAnnounceReady,
  updaterReducer,
  type UpdaterState,
  type UpdaterStatus,
} from "./updaterReducer"

function withStatus(state: UpdaterState, status: UpdaterStatus): UpdaterState {
  return updaterReducer(state, { type: ACTIONS.STATUS_CHANGED, status })
}

const READY: UpdaterStatus = { phase: "ready", version: "0.0.2" }

describe("updaterReducer", () => {
  it("starts idle with nothing announced", () => {
    expect(initialUpdaterState).toEqual({ status: { phase: "idle" }, readyAnnounced: false })
  })

  it("moves through the download phases", () => {
    const downloading = withStatus(initialUpdaterState, {
      phase: "downloading",
      version: "0.0.2",
      percent: 42,
    })
    expect(downloading.status).toEqual({ phase: "downloading", version: "0.0.2", percent: 42 })

    const preparing = withStatus(downloading, { phase: "preparing", version: "0.0.2" })
    expect(preparing.status.phase).toBe("preparing")

    const ready = withStatus(preparing, READY)
    expect(ready.status).toEqual(READY)
    expect(ready.readyAnnounced).toBe(false)
  })

  it("clamps download progress into 0-100", () => {
    const over = withStatus(initialUpdaterState, { phase: "downloading", version: "0.0.2", percent: 140 })
    const under = withStatus(initialUpdaterState, { phase: "downloading", version: "0.0.2", percent: -5 })

    expect(over.status).toMatchObject({ percent: 100 })
    expect(under.status).toMatchObject({ percent: 0 })
    expect(clampPercent(Number.NaN)).toBe(0)
  })

  it("marks the ready state as announced only once it is ready", () => {
    const notReady = updaterReducer(initialUpdaterState, { type: ACTIONS.READY_ANNOUNCED })
    expect(notReady.readyAnnounced).toBe(false)

    const ready = withStatus(initialUpdaterState, READY)
    const announced = updaterReducer(ready, { type: ACTIONS.READY_ANNOUNCED })
    expect(announced.readyAnnounced).toBe(true)
  })

  it("keeps the announcement when the same ready version is reported again", () => {
    const announced = updaterReducer(withStatus(initialUpdaterState, READY), {
      type: ACTIONS.READY_ANNOUNCED,
    })

    expect(withStatus(announced, READY).readyAnnounced).toBe(true)
  })

  it("resets the announcement for a new version or after leaving ready", () => {
    const announced = updaterReducer(withStatus(initialUpdaterState, READY), {
      type: ACTIONS.READY_ANNOUNCED,
    })

    expect(withStatus(announced, { phase: "ready", version: "0.0.3" }).readyAnnounced).toBe(false)

    const failed = withStatus(announced, { phase: "error", message: "Network error" })
    expect(failed.readyAnnounced).toBe(false)
    expect(withStatus(failed, READY).readyAnnounced).toBe(false)
  })
})

describe("shouldAnnounceReady", () => {
  const ready = withStatus(initialUpdaterState, READY)

  it("announces a ready update the first time the window is focused", () => {
    expect(shouldAnnounceReady(ready, true)).toBe(true)
  })

  it("waits while the window is not focused", () => {
    expect(shouldAnnounceReady(ready, false)).toBe(false)
  })

  it("does not announce twice", () => {
    const announced = updaterReducer(ready, { type: ACTIONS.READY_ANNOUNCED })
    expect(shouldAnnounceReady(announced, true)).toBe(false)
  })

  it("does not announce other phases", () => {
    expect(shouldAnnounceReady(initialUpdaterState, true)).toBe(false)
  })
})
