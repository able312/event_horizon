import type { AppUpdater } from "electron-updater"
import type { EventEmitter } from "node:events"
import type { UpdaterSnapshot, UpdaterStatus } from "../../definitions/updater.js"

export const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000
export const INSTALL_PREPARATION_TIMEOUT_MS = 2 * 60 * 1000

type Updater = Pick<AppUpdater, "on" | "removeListener" | "checkForUpdates" |
  "quitAndInstall" | "autoDownload" | "autoInstallOnAppQuit" | "autoRunAppAfterInstall" |
  "allowPrerelease" | "allowDowngrade">
type NativeUpdater = Pick<EventEmitter, "listeners" | "removeListener">

export function isUpdaterEnabled(isPackaged: boolean, platform: string, arch: string): boolean {
  return isPackaged && platform === "darwin" && arch === "arm64"
}

export function createUpdaterService(
  updater: Updater,
  nativeUpdater: NativeUpdater,
  enabled: boolean,
  logError: (error: unknown) => void,
) {
  let snapshot: UpdaterSnapshot = { revision: 0, status: { phase: "idle" } }
  const subscribers = new Set<(snapshot: UpdaterSnapshot) => void>()
  let started = false
  let checking = false
  let installing = false
  let checkTimer: ReturnType<typeof setInterval> | undefined
  let preparationTimer: ReturnType<typeof setTimeout> | undefined
  let handoffListeners: ReturnType<NativeUpdater["listeners"]> = []

  function publish(status: UpdaterStatus) {
    if (!started) return
    snapshot = { revision: snapshot.revision + 1, status }
    for (const subscriber of subscribers) {
      try { subscriber(snapshot) } catch (error) { logError(error) }
    }
  }

  function clearHandoff() {
    clearTimeout(preparationTimer)
    preparationTimer = undefined
    // MacUpdater adds an install-on-download listener in quitAndInstall(). Remove
    // only that handoff's listeners on failure so a late native event cannot quit.
    for (const listener of handoffListeners) nativeUpdater.removeListener("update-downloaded", listener)
    handoffListeners = []
  }

  function fail(error: unknown) {
    logError(error)
    const wasInstalling = installing
    installing = false
    clearHandoff()
    publish({ phase: "error", message: wasInstalling
      ? "Could not prepare the update. Please keep working and try again later."
      : "Could not check for or download the update. We’ll try again later." })
  }

  function isBusy() {
    return ["downloading", "preparing", "ready"].includes(snapshot.status.phase)
  }

  const onChecking = () => { if (!isBusy()) publish({ phase: "checking" }) }
  const onUnavailable = () => { if (!isBusy()) publish({ phase: "idle" }) }
  const onAvailable = (info: { version: string }) => {
    if (!isBusy()) publish({ phase: "downloading", version: info.version, percent: 0 })
  }
  const onProgress = (progress: { percent: number }) => {
    if (snapshot.status.phase !== "downloading") return
    const percent = Number.isFinite(progress.percent) ? Math.max(0, Math.min(100, progress.percent)) : 0
    publish({ ...snapshot.status, percent })
  }
  const onDownloaded = (info: { version: string }) => {
    if (installing) return
    // This is electron-updater's completion event, including cached downloads.
    // Native Squirrel staging is deliberately deferred until confirmation.
    publish({ phase: "preparing", version: info.version })
    publish({ phase: "ready", version: info.version })
  }

  async function check() {
    if (!started || checking || isBusy()) return
    checking = true
    try {
      const result = await updater.checkForUpdates()
      if (result?.downloadPromise) await result.downloadPromise
    } catch (error) {
      if (started) fail(error)
    } finally {
      checking = false
    }
  }

  function start() {
    if (!enabled || started) return
    started = true
    updater.autoDownload = true
    updater.autoInstallOnAppQuit = false
    updater.autoRunAppAfterInstall = true
    updater.allowPrerelease = false
    updater.allowDowngrade = false
    updater.on("checking-for-update", onChecking)
    updater.on("update-not-available", onUnavailable)
    updater.on("update-available", onAvailable)
    updater.on("download-progress", onProgress)
    updater.on("update-downloaded", onDownloaded)
    updater.on("error", fail)
    checkTimer = setInterval(() => { void check() }, UPDATE_CHECK_INTERVAL_MS)
    void check()
  }

  function stop() {
    started = false
    installing = false
    clearInterval(checkTimer)
    clearHandoff()
    updater.removeListener("checking-for-update", onChecking)
    updater.removeListener("update-not-available", onUnavailable)
    updater.removeListener("update-available", onAvailable)
    updater.removeListener("download-progress", onProgress)
    updater.removeListener("update-downloaded", onDownloaded)
    updater.removeListener("error", fail)
    subscribers.clear()
  }

  function restartAndInstall() {
    if (!started || installing || snapshot.status.phase !== "ready") {
      throw new Error("The update is not ready to install.")
    }
    const version = snapshot.status.version
    installing = true
    publish({ phase: "preparing", version })
    preparationTimer = setTimeout(() => fail(new Error("Native update preparation timed out")),
      INSTALL_PREPARATION_TIMEOUT_MS)
    const before = nativeUpdater.listeners("update-downloaded")
    try {
      updater.quitAndInstall()
    } catch (error) {
      fail(error)
      throw new Error("Could not prepare the update. Please try again later.")
    } finally {
      handoffListeners = nativeUpdater.listeners("update-downloaded").filter(listener => !before.includes(listener))
      if (!installing) clearHandoff()
    }
  }

  return {
    start, stop, check, restartAndInstall,
    getStatus: () => snapshot,
    subscribe(listener: (snapshot: UpdaterSnapshot) => void) {
      subscribers.add(listener)
      return () => { subscribers.delete(listener) }
    },
  }
}

export type UpdaterService = ReturnType<typeof createUpdaterService>
