// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { IpcMainInvokeEvent } from "electron"
import type { AuthSnapshot } from "../../definitions/auth.js"
import type { AuthService } from "../services/authService.js"

const mocks = vi.hoisted(() => ({ handle: vi.fn(), removeHandler: vi.fn(), fromWebContents: vi.fn(), getAllWindows: vi.fn() }))
vi.mock("electron", () => ({ ipcMain: mocks, BrowserWindow: mocks }))
import { registerAuthIpcHandlers } from "./authHandler.js"

const rendererUrl = "file:///test/app/dist-react/index.html"
const snapshot: AuthSnapshot = { isAuthenticated: true, user: null, isLoading: false, error: null }

function setup() {
  let publish: (snapshot: AuthSnapshot) => void = () => undefined
  const service = {
    getSnapshot: vi.fn(() => snapshot),
    signIn: vi.fn(async () => undefined),
    signOut: vi.fn(async () => undefined),
    getAccessToken: vi.fn(async () => "token"),
    subscribe: vi.fn((subscriber: (snapshot: AuthSnapshot) => void) => { publish = subscriber; return unsubscribe }),
    stop: vi.fn(),
  } satisfies AuthService
  const unsubscribe = vi.fn()
  const frame = { url: `${rendererUrl}#/events` }
  const event = { sender: { mainFrame: frame }, senderFrame: frame } as unknown as IpcMainInvokeEvent
  const send = vi.fn()
  const window = { isDestroyed: () => false, webContents: { isDestroyed: () => false, send } }
  mocks.fromWebContents.mockReturnValue(window)
  mocks.getAllWindows.mockReturnValue([window])
  const cleanup = registerAuthIpcHandlers(service, rendererUrl)
  function invoke(channel: string, sender: IpcMainInvokeEvent, ...args: unknown[]) {
    const handler = mocks.handle.mock.calls.find(call => call[0] === channel)?.[1] as (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown
    return handler(sender, ...args)
  }
  return { service, event, invoke, send, cleanup, unsubscribe, publish: (next: AuthSnapshot) => publish(next) }
}

beforeEach(() => { vi.clearAllMocks() })

describe("auth IPC", () => {
  it("routes requests from the app page to the service", async () => {
    const state = setup()
    expect(state.invoke("auth:get-status", state.event)).toBe(snapshot)
    await state.invoke("auth:sign-in", state.event)
    await state.invoke("auth:sign-out", state.event)
    expect(state.service.signIn).toHaveBeenCalled()
    expect(state.service.signOut).toHaveBeenCalled()
    expect(await state.invoke("auth:get-access-token", state.event)).toBe("token")
    expect(state.service.getAccessToken).toHaveBeenLastCalledWith({ forceRefresh: false })
    await state.invoke("auth:get-access-token", state.event, { forceRefresh: true })
    expect(state.service.getAccessToken).toHaveBeenLastCalledWith({ forceRefresh: true })
  })

  it("broadcasts status changes and unregisters everything", () => {
    const state = setup()
    state.publish(snapshot)
    expect(state.send).toHaveBeenCalledWith("auth:status-changed", snapshot)
    state.cleanup()
    expect(state.unsubscribe).toHaveBeenCalled()
    expect(mocks.removeHandler.mock.calls.map(call => call[0])).toEqual(["auth:get-status", "auth:sign-in", "auth:sign-out", "auth:get-access-token"])
  })

  it("rejects other pages, subframes, and malformed arguments", () => {
    const state = setup()
    const otherFrame = { url: "https://example.com/" }
    const otherPage = { sender: { mainFrame: otherFrame }, senderFrame: otherFrame } as unknown as IpcMainInvokeEvent
    expect(() => state.invoke("auth:get-access-token", otherPage)).toThrow("Invalid auth request.")
    const subframe = { sender: { mainFrame: { url: rendererUrl } }, senderFrame: { url: rendererUrl } } as unknown as IpcMainInvokeEvent
    expect(() => state.invoke("auth:get-access-token", subframe)).toThrow("Invalid auth request.")
    expect(() => state.invoke("auth:get-access-token", state.event, { forceRefresh: "yes" })).toThrow("Invalid auth request.")
    expect(() => state.invoke("auth:get-access-token", state.event, null)).toThrow("Invalid auth request.")
    expect(() => state.invoke("auth:sign-in", state.event, "extra")).toThrow("Invalid auth request.")
    expect(state.service.getAccessToken).not.toHaveBeenCalled()
    expect(state.service.signIn).not.toHaveBeenCalled()
  })
})
