// @vitest-environment node
import { EventEmitter } from "node:events"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { IpcMainInvokeEvent } from "electron"
import { createUpdaterService } from "../services/updaterService.js"

const mocks = vi.hoisted(() => ({ handle: vi.fn(), removeHandler: vi.fn(), fromWebContents: vi.fn(), getAllWindows: vi.fn() }))
vi.mock("electron", () => ({ ipcMain: mocks, BrowserWindow: mocks }))
import { registerUpdaterIpcHandlers } from "./updaterHandler.js"

const rendererUrl = "file:///test/app/dist-react/index.html"

function setup() {
  const updater = Object.assign(new EventEmitter(), {
    checkForUpdates: vi.fn(async () => null), quitAndInstall: vi.fn(),
    autoDownload: true, autoInstallOnAppQuit: true, autoRunAppAfterInstall: true,
    allowPrerelease: false, allowDowngrade: false,
  })
  const service = createUpdaterService(updater, new EventEmitter(), true, vi.fn())
  service.start()
  const frame = { url: `${rendererUrl}#/events` }
  const event = { sender: { mainFrame: frame }, senderFrame: frame } as unknown as IpcMainInvokeEvent
  const send = vi.fn()
  const window = { isDestroyed: () => false, webContents: { isDestroyed: () => false, send } }
  mocks.fromWebContents.mockReturnValue(window)
  mocks.getAllWindows.mockReturnValue([window])
  const cleanup = registerUpdaterIpcHandlers(service, rendererUrl)
  function invoke(channel: string, ...args: unknown[]) {
    const handler = mocks.handle.mock.calls.find(call => call[0] === channel)?.[1] as (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown
    return handler(event, ...args)
  }
  return { service, updater, event, invoke, send, cleanup }
}

beforeEach(() => { vi.clearAllMocks() })

describe("updater IPC", () => {
  it("reads the snapshot, broadcasts updates, and only installs when ready", () => {
    const state = setup()
    expect(state.invoke("updater:get-status")).toEqual({ revision: 0, status: { phase: "idle" } })
    expect(() => state.invoke("updater:restart-and-install")).toThrow("not ready")
    state.updater.emit("update-downloaded", { version: "0.1.1" })
    expect(state.send).toHaveBeenLastCalledWith("updater:status-changed", expect.objectContaining({ status: { phase: "ready", version: "0.1.1" } }))
    state.invoke("updater:restart-and-install")
    expect(state.updater.quitAndInstall).toHaveBeenCalledOnce()
    expect(() => state.invoke("updater:restart-and-install")).toThrow("not ready")
    state.cleanup()
    expect(mocks.removeHandler).toHaveBeenCalledWith("updater:get-status")
    expect(mocks.removeHandler).toHaveBeenCalledWith("updater:restart-and-install")
    state.send.mockClear()
    state.updater.emit("error", new Error("offline"))
    expect(state.send).not.toHaveBeenCalled()
    state.service.stop()
  })

  it("rejects extra arguments on both operations without forwarding paths or URLs", () => {
    const state = setup()
    for (const channel of ["updater:get-status", "updater:restart-and-install"]) {
      expect(() => state.invoke(channel, "https://untrusted.example/update.zip")).toThrow("Invalid updater request")
    }
    expect(state.updater.quitAndInstall).not.toHaveBeenCalled()
    state.cleanup()
    state.service.stop()
  })

  it("rejects unknown/destroyed windows, subframes, and a main frame navigated away from the app", () => {
    const state = setup()
    mocks.fromWebContents.mockReturnValueOnce(null)
    expect(() => state.invoke("updater:get-status")).toThrow("Invalid updater request")
    mocks.fromWebContents.mockReturnValueOnce({ isDestroyed: () => true })
    expect(() => state.invoke("updater:get-status")).toThrow("Invalid updater request")
    Object.assign(state.event, { senderFrame: { url: rendererUrl } })
    expect(() => state.invoke("updater:get-status")).toThrow("Invalid updater request")
    Object.assign(state.event, { senderFrame: state.event.sender.mainFrame })
    Object.assign(state.event.senderFrame!, { url: "https://untrusted.example/" })
    expect(() => state.invoke("updater:get-status")).toThrow("Invalid updater request")
    state.cleanup()
    state.service.stop()
  })

  it("skips destroyed windows when broadcasting", () => {
    const state = setup()
    mocks.getAllWindows.mockReturnValue([{ isDestroyed: () => true },
      { isDestroyed: () => false, webContents: { isDestroyed: () => true } }])
    state.updater.emit("update-downloaded", { version: "0.1.1" })
    expect(state.send).not.toHaveBeenCalled()
    state.cleanup()
    state.service.stop()
  })
})
