import { describe, expect, it, vi } from "vitest"

type ExposedApi = {
  ipcRenderer: {
    invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
    send: (channel: string, ...args: unknown[]) => void
    on: (channel: string, listener: (...args: unknown[]) => void) => void
    removeListener: (channel: string, listener: (...args: unknown[]) => void) => void
  }
}

async function loadPreload() {
  vi.resetModules()

  let exposedApi: ExposedApi | undefined

  const ipcRenderer = {
    invoke: vi.fn(async () => undefined),
    send: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
  }

  const contextBridge = {
    exposeInMainWorld: vi.fn((key: string, api: ExposedApi) => {
      if (key === "electron") {
        exposedApi = api
      }
    }),
  }

  vi.doMock("electron", () => ({ contextBridge, ipcRenderer }))

  await import("./preload.cts")

  if (!exposedApi) {
    throw new Error("preload did not expose API")
  }

  return { api: exposedApi, ipcRenderer, contextBridge }
}

describe("preload allowlist", () => {
  it("allows invoke channels and forwards args", async () => {
    const { api, ipcRenderer } = await loadPreload()

    await expect(api.ipcRenderer.invoke("events:get-many", { id: 1 })).resolves.toBeUndefined()
    expect(ipcRenderer.invoke).toHaveBeenCalledWith("events:get-many", { id: 1 })

    await expect(api.ipcRenderer.invoke("events:get-by-month", "2026-04")).resolves.toBeUndefined()
    expect(ipcRenderer.invoke).toHaveBeenCalledWith("events:get-by-month", "2026-04")

    await expect(api.ipcRenderer.invoke("events:get-unscheduled")).resolves.toBeUndefined()
    expect(ipcRenderer.invoke).toHaveBeenCalledWith("events:get-unscheduled")
    await expect(
      api.ipcRenderer.invoke("events:search", {
        query: "alpha",
        type: null,
        status: null,
        startFrom: null,
        startTo: null,
        page: 0,
        pageSize: 50,
      }),
    ).resolves.toBeUndefined()
    expect(ipcRenderer.invoke).toHaveBeenCalledWith("events:search", {
      query: "alpha",
      type: null,
      status: null,
      startFrom: null,
      startTo: null,
      page: 0,
      pageSize: 50,
    })

    await expect(
      api.ipcRenderer.invoke("events:import-ics:commit", { sessionId: "session-1", selectedRowIds: [] }),
    ).resolves.toBeUndefined()
    expect(ipcRenderer.invoke).toHaveBeenCalledWith(
      "events:import-ics:commit",
      { sessionId: "session-1", selectedRowIds: [] },
    )

    await expect(
      api.ipcRenderer.invoke("system:open-external", "https://calendar.google.com/calendar/u/0/r/eventedit"),
    ).resolves.toBeUndefined()
    expect(ipcRenderer.invoke).toHaveBeenCalledWith(
      "system:open-external",
      "https://calendar.google.com/calendar/u/0/r/eventedit",
    )
  })

  it("blocks unknown invoke channels", async () => {
    const { api } = await loadPreload()

    expect(() => api.ipcRenderer.invoke("events:get-all")).toThrow(
      "Blocked IPC invoke channel: events:get-all",
    )
  })

  it("allows send channels and forwards args", async () => {
    const { api, ipcRenderer } = await loadPreload()

    expect(() => api.ipcRenderer.send("generate:active", true)).not.toThrow()
    expect(ipcRenderer.send).toHaveBeenCalledWith("generate:active", true)
  })

  it("blocks unknown send channels", async () => {
    const { api } = await loadPreload()

    expect(() => api.ipcRenderer.send("generate:inactive")).toThrow(
      "Blocked IPC send channel: generate:inactive",
    )
  })

  it("wraps listeners for allowed on/removeListener channels", async () => {
    const { api, ipcRenderer } = await loadPreload()

    const handler = vi.fn()

    api.ipcRenderer.on("navigate", handler)

    expect(ipcRenderer.on).toHaveBeenCalledTimes(1)
    const wrappedListener = ipcRenderer.on.mock.calls[0]?.[1]
    expect(wrappedListener).not.toBe(handler)
    expect(typeof wrappedListener).toBe("function")

    api.ipcRenderer.removeListener("navigate", handler)
    expect(ipcRenderer.removeListener).toHaveBeenCalledWith("navigate", wrappedListener)

    api.ipcRenderer.on("events:import-ics:review", handler)
    expect(ipcRenderer.on).toHaveBeenCalledWith("events:import-ics:review", expect.any(Function))
  })

  it("blocks unknown on/removeListener channels", async () => {
    const { api } = await loadPreload()

    expect(() => api.ipcRenderer.on("navigate:extra", () => {})).toThrow(
      "Blocked IPC on channel: navigate:extra",
    )
    expect(() => api.ipcRenderer.removeListener("navigate:extra", () => {})).toThrow(
      "Blocked IPC removeListener channel: navigate:extra",
    )
  })
})
