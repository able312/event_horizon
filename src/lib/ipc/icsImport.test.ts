import { describe, expect, it, vi } from "vitest"
import { onIcsImportReview } from "./icsImport"

describe("icsImport ipc", () => {
  it("onIcsImportReview subscribes and unsubscribes to the expected channel", () => {
    const onMock = vi.mocked(window.electron.ipcRenderer.on)
    const removeListenerMock = vi.mocked(window.electron.ipcRenderer.removeListener)
    const listener = vi.fn()

    const unsubscribe = onIcsImportReview(listener)

    expect(onMock).toHaveBeenCalledTimes(1)
    expect(onMock).toHaveBeenCalledWith(
      "events:import-ics:review",
      expect.any(Function),
    )

    const wrappedListener = onMock.mock.calls[0]?.[1]
    if (typeof wrappedListener !== "function") {
      throw new Error("Expected wrapped IPC listener")
    }

    wrappedListener({ test: true })
    expect(listener).toHaveBeenCalledWith({ test: true })

    unsubscribe()
    expect(removeListenerMock).toHaveBeenCalledWith("events:import-ics:review", wrappedListener)
  })
})
