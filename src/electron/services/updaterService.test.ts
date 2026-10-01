// @vitest-environment node
import { EventEmitter } from "node:events"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { UpdateCheckResult } from "electron-updater"
import { createUpdaterService, INSTALL_PREPARATION_TIMEOUT_MS, isUpdaterEnabled, UPDATE_CHECK_INTERVAL_MS } from "./updaterService.js"

class FakeUpdater extends EventEmitter {
  autoDownload = false
  autoInstallOnAppQuit = true
  autoRunAppAfterInstall = false
  allowPrerelease = true
  allowDowngrade = true
  checkForUpdates = vi.fn(async (): Promise<UpdateCheckResult | null> => {
    this.emit("checking-for-update")
    this.emit("update-not-available", {})
    return null
  })
  quitAndInstall = vi.fn(() => undefined)
}

function setup(enabled = true) {
  vi.useFakeTimers()
  const updater = new FakeUpdater()
  const native = new EventEmitter()
  const log = vi.fn()
  const service = createUpdaterService(updater, native, enabled, log)
  return { updater, native, log, service }
}

afterEach(() => { vi.useRealTimers() })

describe("updater service", () => {
  it("enables only packaged macOS arm64 and leaves unsupported builds idle", () => {
    expect(isUpdaterEnabled(true, "darwin", "arm64")).toBe(true)
    for (const args of [[false, "darwin", "arm64"], [true, "win32", "arm64"], [true, "darwin", "x64"]] as const) {
      expect(isUpdaterEnabled(...args)).toBe(false)
    }
    const { service, updater } = setup(false)
    service.start()
    expect(updater.checkForUpdates).not.toHaveBeenCalled()
    expect(() => service.restartAndInstall()).toThrow("not ready")
  })

  it("checks on startup and every six hours, idempotently, with automatic downloads but no quit installation", async () => {
    const { updater, service } = setup()
    service.start()
    service.start()
    await vi.advanceTimersByTimeAsync(UPDATE_CHECK_INTERVAL_MS)
    expect(updater.checkForUpdates).toHaveBeenCalledTimes(2)
    expect(service.getStatus().status.phase).toBe("idle")
    expect(updater.autoDownload).toBe(true)
    expect(updater.autoInstallOnAppQuit).toBe(false)
    expect(updater.allowPrerelease).toBe(false)
    expect(updater.allowDowngrade).toBe(false)
    service.stop()
    await vi.advanceTimersByTimeAsync(UPDATE_CHECK_INTERVAL_MS)
    expect(updater.checkForUpdates).toHaveBeenCalledTimes(2)
    expect(updater.listenerCount("download-progress")).toBe(0)
    expect(updater.quitAndInstall).not.toHaveBeenCalled()
  })

  it("does not check concurrently or replace a download or ready status", async () => {
    const { updater, service } = setup()
    let finish: ((result: UpdateCheckResult | null) => void) | undefined
    updater.checkForUpdates.mockImplementation(() => new Promise(resolve => { finish = resolve }))
    service.start()
    await service.check()
    expect(updater.checkForUpdates).toHaveBeenCalledTimes(1)
    updater.emit("update-available", { version: "0.1.1" })
    finish?.(null)
    await vi.advanceTimersByTimeAsync(UPDATE_CHECK_INTERVAL_MS)
    expect(updater.checkForUpdates).toHaveBeenCalledTimes(1)
    updater.emit("update-downloaded", { version: "0.1.1" })
    updater.emit("checking-for-update")
    updater.emit("update-not-available", {})
    updater.emit("download-progress", { percent: 80 })
    await service.check()
    expect(service.getStatus().status).toEqual({ phase: "ready", version: "0.1.1" })
    expect(updater.checkForUpdates).toHaveBeenCalledTimes(1)
    service.stop()
  })

  it("waits for completion after 100% and accepts cached downloads with no progress", () => {
    const { updater, service } = setup()
    const statuses: string[] = []
    service.subscribe(snapshot => statuses.push(snapshot.status.phase))
    service.start()
    updater.emit("update-available", { version: "0.1.1" })
    updater.emit("download-progress", { percent: 150 })
    expect(service.getStatus().status).toEqual({ phase: "downloading", version: "0.1.1", percent: 100 })
    updater.emit("download-progress", { percent: NaN })
    expect(service.getStatus().status).toMatchObject({ percent: 0 })
    updater.emit("update-downloaded", { version: "0.1.1" })
    expect(statuses.slice(-2)).toEqual(["preparing", "ready"])
    service.stop()
    const cached = setup()
    cached.service.start()
    cached.updater.emit("update-downloaded", { version: "0.1.1" })
    expect(cached.service.getStatus().status.phase).toBe("ready")
    cached.service.stop()
  })

  it("handles rejected checks and emitted errors, then recovers on a scheduled check", async () => {
    const { updater, service, log } = setup()
    updater.checkForUpdates.mockRejectedValueOnce(new Error("secret feed details"))
    service.start()
    await vi.advanceTimersByTimeAsync(0)
    expect(service.getStatus().status).toMatchObject({ phase: "error" })
    expect(JSON.stringify(service.getStatus())).not.toContain("secret")
    expect(log).toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(UPDATE_CHECK_INTERVAL_MS)
    expect(service.getStatus().status.phase).toBe("idle")
    updater.emit("error", new Error("offline"))
    expect(service.getStatus().status.phase).toBe("error")
    service.stop()
  })

  it("observes automatic download promise rejection", async () => {
    const { updater, service } = setup()
    updater.checkForUpdates.mockImplementationOnce(async () => ({
      isUpdateAvailable: true,
      updateInfo: { version: "0.1.1", files: [], releaseDate: "2026-10-01" },
      downloadPromise: Promise.reject(new Error("download failed")),
    }))
    service.start()
    await vi.advanceTimersByTimeAsync(0)
    expect(service.getStatus().status.phase).toBe("error")
    service.stop()
  })

  it("rejects installation before ready and accepts exactly one request after confirmation", () => {
    const { updater, service } = setup()
    service.start()
    expect(() => service.restartAndInstall()).toThrow("not ready")
    updater.emit("update-downloaded", { version: "0.1.1" })
    service.restartAndInstall()
    expect(service.getStatus().status).toEqual({ phase: "preparing", version: "0.1.1" })
    expect(() => service.restartAndInstall()).toThrow("not ready")
    expect(updater.quitAndInstall).toHaveBeenCalledTimes(1)
    service.stop()
  })

  it("removes only the package handoff listener after native failure, preventing late installation", () => {
    const { updater, native, service } = setup()
    const existing = vi.fn()
    const install = vi.fn()
    native.on("update-downloaded", existing)
    updater.quitAndInstall.mockImplementation(() => { native.on("update-downloaded", install) })
    service.start()
    updater.emit("update-downloaded", { version: "0.1.1" })
    service.restartAndInstall()
    updater.emit("error", new Error("signature verification failed"))
    expect(service.getStatus().status).toMatchObject({ phase: "error", message: expect.stringContaining("prepare") })
    native.emit("update-downloaded")
    expect(existing).toHaveBeenCalledOnce()
    expect(install).not.toHaveBeenCalled()
    service.stop()
  })

  it("handles synchronous native failure and a preparation timeout without leaving a spinner", async () => {
    const { updater, service, native } = setup()
    service.start()
    updater.emit("update-downloaded", { version: "0.1.1" })
    updater.quitAndInstall.mockImplementationOnce(() => { throw new Error("native unavailable") })
    expect(() => service.restartAndInstall()).toThrow("Could not prepare")
    expect(service.getStatus().status.phase).toBe("error")
    const install = vi.fn()
    updater.quitAndInstall.mockImplementation(() => { native.on("update-downloaded", install) })
    updater.emit("update-downloaded", { version: "0.1.1" })
    service.restartAndInstall()
    await vi.advanceTimersByTimeAsync(INSTALL_PREPARATION_TIMEOUT_MS)
    expect(service.getStatus().status.phase).toBe("error")
    native.emit("update-downloaded")
    expect(install).not.toHaveBeenCalled()
    service.stop()
  })

  it("cleans up a handoff listener even when native error is emitted during quitAndInstall", () => {
    const { updater, native, service } = setup()
    const install = vi.fn()
    service.start()
    updater.emit("update-downloaded", { version: "0.1.1" })
    updater.quitAndInstall.mockImplementation(() => {
      native.on("update-downloaded", install)
      updater.emit("error", new Error("synchronous native error"))
    })
    service.restartAndInstall()
    expect(service.getStatus().status.phase).toBe("error")
    native.emit("update-downloaded")
    expect(install).not.toHaveBeenCalled()
    service.stop()
  })

  it("does not let a closed-window broadcast failure interrupt updater work", () => {
    const { updater, service, log } = setup()
    const receive = vi.fn()
    service.subscribe(() => { throw new Error("window closed") })
    service.subscribe(receive)
    service.start()
    expect(() => updater.emit("update-downloaded", { version: "0.1.1" })).not.toThrow()
    expect(service.getStatus().status.phase).toBe("ready")
    expect(receive).toHaveBeenLastCalledWith(expect.objectContaining({ status: { phase: "ready", version: "0.1.1" } }))
    expect(log).toHaveBeenCalled()
    service.stop()
  })
})
