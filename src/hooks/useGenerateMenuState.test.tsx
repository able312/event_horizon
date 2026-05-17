import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useGenerateMenuState } from "./useGenerateMenuState"

let pathname = "/"

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router")
  return {
    ...actual,
    useLocation: () => ({ pathname }),
  }
})

describe("getGenerateMenuContext", () => {
  beforeEach(() => {
    pathname = "/"
    vi.clearAllMocks()
  })

  it("sends event-details context for /events/:id paths", () => {
    pathname = "/events/evt_1"
    renderHook(() => useGenerateMenuState())

    expect(window.electron.ipcRenderer.send).toHaveBeenCalledWith("generate:active", {
      view: "event-details",
      eventId: "evt_1",
    })
  })

  it("sends other context for non-detail paths", () => {
    pathname = "/preview/timeline/evt_1"
    renderHook(() => useGenerateMenuState())

    expect(window.electron.ipcRenderer.send).toHaveBeenCalledWith("generate:active", {
      view: "other",
      eventId: null,
    })
  })

  it("sends other context for production-like prefixed paths", () => {
    pathname = "/dist-react/index.html/events/evt_1"
    renderHook(() => useGenerateMenuState())

    expect(window.electron.ipcRenderer.send).toHaveBeenCalledWith("generate:active", {
      view: "other",
      eventId: null,
    })
  })
})
