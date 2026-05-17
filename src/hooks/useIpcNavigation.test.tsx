import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useIpcNavigation } from "./useIpcNavigation"

const navigateMock = vi.fn()

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router")
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

type Listener = (...args: unknown[]) => void

function createIpcRendererMock() {
  const listeners = new Map<string, Set<Listener>>()

  function getListeners(channel: string) {
    const existing = listeners.get(channel)
    if (existing) return existing
    const created = new Set<Listener>()
    listeners.set(channel, created)
    return created
  }

  const on = vi.fn((channel: string, listener: Listener) => {
    getListeners(channel).add(listener)
  })

  const removeListener = vi.fn((channel: string, listener: Listener) => {
    getListeners(channel).delete(listener)
  })

  function emit(channel: string, ...args: unknown[]) {
    for (const listener of getListeners(channel)) {
      listener(...args)
    }
  }

  function listenerCount(channel: string) {
    return getListeners(channel).size
  }

  return { on, removeListener, emit, listenerCount }
}

describe("useIpcNavigation listener cleanup", () => {
  let ipcRendererMock: ReturnType<typeof createIpcRendererMock>

  beforeEach(() => {
    ipcRendererMock = createIpcRendererMock()
    window.electron = {
      ipcRenderer: {
        invoke: vi.fn(async () => undefined),
        send: vi.fn(),
        on: ipcRendererMock.on,
        removeListener: ipcRendererMock.removeListener,
      },
    }
    navigateMock.mockClear()
  })

  it("registers and cleans up the same handler", () => {
    const { unmount } = renderHook(() => useIpcNavigation())

    expect(ipcRendererMock.on).toHaveBeenCalledTimes(1)
    const handler = ipcRendererMock.on.mock.calls[0]?.[1]
    expect(typeof handler).toBe("function")

    unmount()

    expect(ipcRendererMock.removeListener).toHaveBeenCalledTimes(1)
    expect(ipcRendererMock.removeListener).toHaveBeenCalledWith("navigate", handler)
  })

  it("does not duplicate listeners across remounts", () => {
    const first = renderHook(() => useIpcNavigation())
    first.unmount()

    expect(ipcRendererMock.listenerCount("navigate")).toBe(0)

    const second = renderHook(() => useIpcNavigation())
    expect(ipcRendererMock.listenerCount("navigate")).toBe(1)

    second.unmount()

    expect(ipcRendererMock.listenerCount("navigate")).toBe(0)
    expect(ipcRendererMock.on).toHaveBeenCalledTimes(2)
    expect(ipcRendererMock.removeListener).toHaveBeenCalledTimes(2)
  })

  it("emits navigate once per event", () => {
    const { unmount } = renderHook(() => useIpcNavigation())

    ipcRendererMock.emit("navigate", "/events/1")

    expect(navigateMock).toHaveBeenCalledTimes(1)
    expect(navigateMock).toHaveBeenCalledWith("/events/1")

    unmount()
  })
})
