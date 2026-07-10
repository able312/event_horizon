import { beforeEach, describe, expect, it, vi } from "vitest"

const handleMock = vi.fn()
const openExternalMock = vi.fn()

vi.mock("electron", () => ({
  ipcMain: {
    handle: handleMock,
  },
  shell: {
    openExternal: openExternalMock,
  },
}))

describe("registerSystemIpcHandlers", () => {
  beforeEach(() => {
    handleMock.mockReset()
    openExternalMock.mockReset()
  })

  it("registers system:open-external and opens allowed URL", async () => {
    const { registerSystemIpcHandlers } = await import("./systemHandler.js")
    registerSystemIpcHandlers()

    const call = handleMock.mock.calls.find((entry) => entry[0] === "system:open-external")
    expect(call).toBeTruthy()

    const handler = call?.[1] as ((...args: unknown[]) => Promise<void>) | undefined
    expect(typeof handler).toBe("function")

    await handler?.({}, "https://calendar.google.com/calendar/u/0/r/eventedit?text=abc")
    expect(openExternalMock).toHaveBeenCalledWith("https://calendar.google.com/calendar/u/0/r/eventedit?text=abc")
  })

  it("rejects invalid urls", async () => {
    const { registerSystemIpcHandlers } = await import("./systemHandler.js")
    registerSystemIpcHandlers()

    const call = handleMock.mock.calls.find((entry) => entry[0] === "system:open-external")
    const handler = call?.[1] as ((...args: unknown[]) => Promise<void>) | undefined

    await expect(handler?.({}, "not-a-url")).rejects.toThrow("Invalid external URL")
    expect(openExternalMock).not.toHaveBeenCalled()
  })

  it("rejects non-https urls", async () => {
    const { registerSystemIpcHandlers } = await import("./systemHandler.js")
    registerSystemIpcHandlers()

    const call = handleMock.mock.calls.find((entry) => entry[0] === "system:open-external")
    const handler = call?.[1] as ((...args: unknown[]) => Promise<void>) | undefined

    await expect(handler?.({}, "http://calendar.google.com/calendar/u/0/r/eventedit")).rejects.toThrow(
      "Only https external URLs are allowed",
    )
    expect(openExternalMock).not.toHaveBeenCalled()
  })

  it("opens allowed Gmail compose URL", async () => {
    const { registerSystemIpcHandlers } = await import("./systemHandler.js")
    registerSystemIpcHandlers()

    const call = handleMock.mock.calls.find((entry) => entry[0] === "system:open-external")
    const handler = call?.[1] as ((...args: unknown[]) => Promise<void>) | undefined

    await handler?.(
      {},
      "https://mail.google.com/mail/u/0/?view=cm&fs=1&to=client%40example.com&su=Attn%2C+Event",
    )
    expect(openExternalMock).toHaveBeenCalledWith(
      "https://mail.google.com/mail/u/0/?view=cm&fs=1&to=client%40example.com&su=Attn%2C+Event",
    )
  })

  it("rejects disallowed origins", async () => {
    const { registerSystemIpcHandlers } = await import("./systemHandler.js")
    registerSystemIpcHandlers()

    const call = handleMock.mock.calls.find((entry) => entry[0] === "system:open-external")
    const handler = call?.[1] as ((...args: unknown[]) => Promise<void>) | undefined

    await expect(handler?.({}, "https://example.com/bad")).rejects.toThrow("External URL origin not allowed")
    expect(openExternalMock).not.toHaveBeenCalled()
  })
})
