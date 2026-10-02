import { describe, expect, it, vi } from "vitest"
import type { UpdaterApi, UpdaterSnapshot } from "../../../definitions/updater"
import { synchronizeUpdater } from "./synchronizeUpdater"

function setup() {
  let resolve: ((snapshot: UpdaterSnapshot) => void) | undefined
  let reject: ((error: Error) => void) | undefined
  let listener: ((snapshot: UpdaterSnapshot) => void) | undefined
  const unsubscribe = vi.fn()
  const api: UpdaterApi = {
    getStatus: () => new Promise((ok, fail) => { resolve = ok; reject = fail }),
    onStatusChanged: callback => { listener = callback; return unsubscribe },
    restartAndInstall: vi.fn(async () => undefined),
  }
  const onStatus = vi.fn()
  const stop = synchronizeUpdater(api, onStatus)
  return { onStatus, stop, unsubscribe, resolve: (value: UpdaterSnapshot) => resolve?.(value),
    reject: () => reject?.(new Error("internal")), emit: (value: UpdaterSnapshot) => listener?.(value) }
}

describe("updater synchronization", () => {
  it("subscribes before retrieving the snapshot and ignores stale or duplicate revisions", async () => {
    const state = setup()
    const ready = { revision: 4, status: { phase: "ready", version: "0.1.1" } } as const
    state.emit(ready)
    state.resolve({ revision: 2, status: { phase: "idle" } })
    await Promise.resolve()
    state.emit(ready)
    expect(state.onStatus).toHaveBeenCalledExactlyOnceWith(ready.status)
    state.stop()
  })

  it("recovers the current state from a snapshot and cleans up on remount", async () => {
    const state = setup()
    state.resolve({ revision: 0, status: { phase: "idle" } })
    await Promise.resolve()
    expect(state.onStatus).toHaveBeenCalledExactlyOnceWith({ phase: "idle" })
    state.stop()
    state.emit({ revision: 1, status: { phase: "ready", version: "0.1.1" } })
    expect(state.unsubscribe).toHaveBeenCalledOnce()
    expect(state.onStatus).toHaveBeenCalledTimes(1)
    const next = setup()
    next.resolve({ revision: 1, status: { phase: "ready", version: "0.1.1" } })
    await Promise.resolve()
    expect(next.onStatus).toHaveBeenCalledExactlyOnceWith({ phase: "ready", version: "0.1.1" })
    next.stop()
  })

  it("ignores a snapshot after unmount and hides internal snapshot errors", async () => {
    const state = setup()
    state.stop()
    state.resolve({ revision: 0, status: { phase: "idle" } })
    await Promise.resolve()
    expect(state.onStatus).not.toHaveBeenCalled()
    const failed = setup()
    failed.reject()
    await Promise.resolve()
    await Promise.resolve()
    expect(failed.onStatus).toHaveBeenCalledWith({ phase: "error", message: expect.not.stringContaining("internal") })
    failed.stop()
  })

  it("does not replace a live event with a failed snapshot request", async () => {
    const state = setup()
    state.emit({ revision: 1, status: { phase: "ready", version: "0.1.1" } })
    state.reject()
    await Promise.resolve()
    await Promise.resolve()
    expect(state.onStatus).toHaveBeenCalledTimes(1)
    state.stop()
  })
})
