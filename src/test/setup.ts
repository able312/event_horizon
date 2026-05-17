import { cleanup } from "@testing-library/react"
import { afterEach, beforeEach, vi } from "vitest"

vi.mock("sonner", async () => {
  const actual = await vi.importActual<typeof import("sonner")>("sonner")
  const toast = Object.assign(vi.fn(), {
    error: vi.fn(),
    success: vi.fn(),
    loading: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    dismiss: vi.fn(),
  })

  return { ...actual, toast }
})

const ipcRendererMock = {
  invoke: vi.fn(async () => undefined),
  send: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
}

function setElectronMock() {
  if (typeof window === "undefined") return

  window.electron = {
    ipcRenderer: ipcRendererMock,
  }
}

setElectronMock()

beforeEach(() => {
  setElectronMock()
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
