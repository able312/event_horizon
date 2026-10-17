// @vitest-environment node
import { describe, expect, it, vi } from "vitest"
import type { BrowserWindow } from "electron"
import { hideOnClose } from "./windowClose.js"

function fakeWindow(fullScreen = false) {
  const listeners = new Map<string, () => void>()
  const window = {
    on: vi.fn((name: string, listener: () => void) => { listeners.set(name, listener) }),
    once: vi.fn((name: string, listener: () => void) => { listeners.set(name, listener) }),
    hide: vi.fn(),
    isFullScreen: vi.fn(() => fullScreen),
    setFullScreen: vi.fn(),
  }
  function close() {
    const event = { preventDefault: vi.fn() }
    ;(listeners.get("close") as unknown as (event: { preventDefault: () => void }) => void)(event)
    return event
  }
  return { window, listeners, close, typed: window as unknown as BrowserWindow }
}

describe("hideOnClose", () => {
  it("hides the macOS window instead of closing it", () => {
    const { window, typed, close } = fakeWindow()
    hideOnClose(typed, "darwin", () => false)
    expect(close().preventDefault).toHaveBeenCalledOnce()
    expect(window.hide).toHaveBeenCalledOnce()
  })
  it("leaves full screen before hiding, so no empty Space is left behind", () => {
    const { window, typed, close, listeners } = fakeWindow(true)
    hideOnClose(typed, "darwin", () => false)
    close()
    expect(window.setFullScreen).toHaveBeenCalledWith(false)
    expect(window.hide).not.toHaveBeenCalled()
    listeners.get("leave-full-screen")!()
    expect(window.hide).toHaveBeenCalledOnce()
  })
  it("lets the window close while quitting", () => {
    let quitting = false
    const { window, typed, close } = fakeWindow()
    hideOnClose(typed, "darwin", () => quitting)
    quitting = true
    expect(close().preventDefault).not.toHaveBeenCalled()
    expect(window.hide).not.toHaveBeenCalled()
  })
  it("keeps the normal close (and quit) on Windows", () => {
    const { window, typed } = fakeWindow()
    hideOnClose(typed, "win32", () => false)
    expect(window.on).not.toHaveBeenCalled()
  })
})
