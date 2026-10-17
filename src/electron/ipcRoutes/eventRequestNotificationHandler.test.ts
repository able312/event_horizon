import { beforeEach, describe, expect, it, vi } from "vitest"
import type { IpcMainInvokeEvent } from "electron"

const mocks = vi.hoisted(() => {
  const window = {
    isDestroyed: vi.fn(() => false), isFocused: vi.fn(() => false), flashFrame: vi.fn(),
    webContents: { isDestroyed: vi.fn(() => false), send: vi.fn() },
  }
  return {
    window, handle: vi.fn(), removeHandler: vi.fn(), badge: vi.fn(), on: vi.fn(), off: vi.fn(),
    supported: vi.fn(() => true), focus: vi.fn(), fromWebContents: vi.fn(() => window),
    show: vi.fn(), close: vi.fn(), notificationOn: vi.fn(),
  }
})
vi.mock("electron", () => ({
  app: { dock: { setBadge: mocks.badge }, on: mocks.on, removeListener: mocks.off },
  BrowserWindow: { fromWebContents: mocks.fromWebContents, getAllWindows: () => [mocks.window] },
  ipcMain: { handle: mocks.handle, removeHandler: mocks.removeHandler },
  Notification: class {
    static isSupported = mocks.supported
    on = mocks.notificationOn
    show = mocks.show
    close = mocks.close
  },
}))
vi.mock("../services/authPlatform.js", () => ({ focusApp: mocks.focus }))
import { registerEventRequestNotificationHandlers } from "./eventRequestNotificationHandler"

const rendererUrl = "http://localhost:42069/"
function event(url = rendererUrl, topLevel = true) {
  const frame = { url }
  return { sender: { mainFrame: frame }, senderFrame: topLevel ? frame : { url } } as unknown as IpcMainInvokeEvent
}
function handler(channel: string) {
  return mocks.handle.mock.calls.find(call => call[0] === channel)![1] as (event: IpcMainInvokeEvent, ...args: unknown[]) => void
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.supported.mockReturnValue(true)
  mocks.window.isDestroyed.mockReturnValue(false)
  mocks.window.isFocused.mockReturnValue(false)
  mocks.fromWebContents.mockReturnValue(mocks.window)
})
describe("event request notification IPC", () => {
  it("shows a notification whose click focuses the app and opens the Inbox", () => {
    registerEventRequestNotificationHandlers(rendererUrl, "darwin")
    handler("event-requests:notify-new")(event(`${rendererUrl}#/contacts`))
    expect(mocks.show).toHaveBeenCalledOnce()
    const click = mocks.notificationOn.mock.calls.find(call => call[0] === "click")![1] as () => void
    click()
    expect(mocks.focus).toHaveBeenCalledOnce()
    expect(mocks.window.webContents.send).toHaveBeenCalledWith("navigate", "/events?view=inbox")
  })
  it("reopens the Inbox if the macOS window was closed after delivery", () => {
    const reopenInbox = vi.fn()
    registerEventRequestNotificationHandlers(rendererUrl, "darwin", reopenInbox)
    handler("event-requests:notify-new")(event())
    mocks.window.isDestroyed.mockReturnValue(true)
    const click = mocks.notificationOn.mock.calls.find(call => call[0] === "click")![1] as () => void
    click()
    expect(reopenInbox).toHaveBeenCalledOnce()
    expect(mocks.window.webContents.send).not.toHaveBeenCalled()
  })
  it("rejects foreign frames, origins and invalid arguments before side effects", () => {
    registerEventRequestNotificationHandlers(rendererUrl)
    const notify = handler("event-requests:notify-new")
    expect(() => notify(event("https://example.com/"))).toThrow("Invalid notification")
    expect(() => notify(event(rendererUrl, false))).toThrow("Invalid notification")
    expect(() => notify(event(), "arbitrary body")).toThrow("Invalid notification")
    const count = handler("event-requests:set-pending-count")
    for (const value of [-1, 1.5, NaN, Infinity, "1", null]) {
      expect(() => count(event(), value)).toThrow("Invalid pending")
    }
    expect(() => count(event(), 1, 2)).toThrow("Invalid pending")
    expect(mocks.show).not.toHaveBeenCalled()
    expect(mocks.badge).not.toHaveBeenCalled()
  })
  it("updates and clears the macOS badge and unregisters handlers", () => {
    const cleanup = registerEventRequestNotificationHandlers(rendererUrl, "darwin")
    handler("event-requests:set-pending-count")(event(), 12)
    expect(mocks.badge).toHaveBeenLastCalledWith("12")
    handler("event-requests:set-pending-count")(event(), 0)
    expect(mocks.badge).toHaveBeenLastCalledWith("")
    cleanup()
    expect(mocks.removeHandler).toHaveBeenCalledTimes(2)
    expect(mocks.off).toHaveBeenCalledWith("browser-window-focus", expect.any(Function))
    expect(mocks.off).toHaveBeenCalledWith("window-all-closed", expect.any(Function))
  })
  it("clears the macOS badge once no window is left to keep it current", () => {
    registerEventRequestNotificationHandlers(rendererUrl, "darwin")
    handler("event-requests:set-pending-count")(event(), 4)
    const allClosed = mocks.on.mock.calls.find(call => call[0] === "window-all-closed")![1] as () => void
    allClosed()
    expect(mocks.badge).toHaveBeenLastCalledWith("")
  })
  it("flashes Windows in the background even without notification support, stopping on focus or zero pending", () => {
    registerEventRequestNotificationHandlers(rendererUrl, "win32")
    mocks.supported.mockReturnValue(false)
    handler("event-requests:notify-new")(event())
    expect(mocks.window.flashFrame).toHaveBeenLastCalledWith(true)
    expect(mocks.show).not.toHaveBeenCalled()
    const focus = mocks.on.mock.calls.find(call => call[0] === "browser-window-focus")![1] as () => void
    focus()
    expect(mocks.window.flashFrame).toHaveBeenLastCalledWith(false)
    handler("event-requests:set-pending-count")(event(), 0)
    expect(mocks.window.flashFrame).toHaveBeenLastCalledWith(false)
    mocks.window.flashFrame.mockClear()
    mocks.window.isFocused.mockReturnValue(true)
    handler("event-requests:notify-new")(event())
    expect(mocks.window.flashFrame).not.toHaveBeenCalled()
  })
})
