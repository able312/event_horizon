// @vitest-environment node
import { describe, expect, it, vi } from "vitest"
import type { WebContents } from "electron"
import { isAppNavigation, lockWindowToApp } from "./windowSecurity.js"

const PACKAGED_URL = "file:///Applications/Event%20Horizon.app/Contents/Resources/app.asar/dist-react/index.html"
const DEV_URL = "http://localhost:42069/"

type Listener = (event: { preventDefault: () => void }, url: string) => void

function fakeContents() {
  const listeners = new Map<string, Listener>()
  const contents = {
    on: vi.fn((name: string, listener: Listener) => { listeners.set(name, listener) }),
    setWindowOpenHandler: vi.fn(),
  }
  function fire(name: string, url = "") {
    const event = { preventDefault: vi.fn() }
    listeners.get(name)!(event, url)
    return event
  }
  return { contents, fire, typed: contents as unknown as WebContents }
}

describe("isAppNavigation", () => {
  it("allows the app's own page, with or without a hash route", () => {
    expect(isAppNavigation(PACKAGED_URL, PACKAGED_URL)).toBe(true)
    expect(isAppNavigation(`${PACKAGED_URL}#/events?view=inbox`, PACKAGED_URL)).toBe(true)
    expect(isAppNavigation(`${DEV_URL}#/contacts`, DEV_URL)).toBe(true)
  })

  it("refuses remote pages, other local files and unparseable URLs", () => {
    expect(isAppNavigation("https://evil.example/", PACKAGED_URL)).toBe(false)
    expect(isAppNavigation("file:///etc/passwd", PACKAGED_URL)).toBe(false)
    expect(isAppNavigation("http://localhost:42070/callback", DEV_URL)).toBe(false)
    expect(isAppNavigation("not a url", DEV_URL)).toBe(false)
  })
})

describe("lockWindowToApp", () => {
  it("denies every new window", () => {
    const { contents, typed } = fakeContents()
    lockWindowToApp(typed, DEV_URL)
    const handler = contents.setWindowOpenHandler.mock.calls[0][0] as () => unknown
    expect(handler()).toEqual({ action: "deny" })
  })

  it("blocks navigation and redirects off the app but lets hash routes through", () => {
    const { fire, typed } = fakeContents()
    lockWindowToApp(typed, DEV_URL)
    expect(fire("will-navigate", "https://evil.example/").preventDefault).toHaveBeenCalledOnce()
    expect(fire("will-redirect", "https://evil.example/").preventDefault).toHaveBeenCalledOnce()
    expect(fire("will-navigate", `${DEV_URL}#/events`).preventDefault).not.toHaveBeenCalled()
  })

  it("refuses to attach webviews", () => {
    const { fire, typed } = fakeContents()
    lockWindowToApp(typed, DEV_URL)
    expect(fire("will-attach-webview").preventDefault).toHaveBeenCalledOnce()
  })
})
