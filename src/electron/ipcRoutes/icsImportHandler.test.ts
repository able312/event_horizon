import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const handleMock = vi.fn()
const showOpenDialogMock = vi.fn()
const fromWebContentsMock = vi.fn()
const parseIcsImportFileMock = vi.fn()

vi.mock("electron", () => ({
  ipcMain: { handle: handleMock },
  dialog: { showOpenDialog: showOpenDialogMock },
  BrowserWindow: { fromWebContents: fromWebContentsMock },
}))

vi.mock("../services/icsImportService.js", () => ({
  parseIcsImportFile: parseIcsImportFileMock,
}))

function fakeWindow() {
  return { webContents: { send: vi.fn() } }
}

async function registeredHandler() {
  const { registerIcsImportIpcHandlers } = await import("./icsImportHandler.js")
  registerIcsImportIpcHandlers()
  const call = handleMock.mock.calls.find((entry) => entry[0] === "events:import-ics:open")
  return call?.[1] as (event: { sender: unknown }) => Promise<void>
}

describe("registerIcsImportIpcHandlers", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    for (const mock of [handleMock, showOpenDialogMock, fromWebContentsMock, parseIcsImportFileMock]) mock.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("opens the picker for the sender's window and sends the parsed rows to review", async () => {
    const window = fakeWindow()
    const payload = { rows: [] }
    fromWebContentsMock.mockReturnValue(window)
    showOpenDialogMock.mockResolvedValue({ canceled: false, filePaths: ["/tmp/calendar.ics"] })
    parseIcsImportFileMock.mockResolvedValue(payload)

    const handler = await registeredHandler()
    const sender = { id: 1 }
    await handler({ sender })

    expect(fromWebContentsMock).toHaveBeenCalledWith(sender)
    expect(showOpenDialogMock).toHaveBeenCalledWith(window, expect.objectContaining({ properties: ["openFile"] }))
    expect(parseIcsImportFileMock).toHaveBeenCalledWith("/tmp/calendar.ics")
    expect(window.webContents.send).toHaveBeenCalledExactlyOnceWith("navigate", "/events")

    vi.advanceTimersByTime(150)
    expect(window.webContents.send).toHaveBeenLastCalledWith("events:import-ics:review", payload)
  })

  it("does nothing when the picker is cancelled", async () => {
    const window = fakeWindow()
    fromWebContentsMock.mockReturnValue(window)
    showOpenDialogMock.mockResolvedValue({ canceled: true, filePaths: [] })

    const handler = await registeredHandler()
    await handler({ sender: {} })

    expect(parseIcsImportFileMock).not.toHaveBeenCalled()
    expect(window.webContents.send).not.toHaveBeenCalled()
  })

  it("ignores senders without a window", async () => {
    fromWebContentsMock.mockReturnValue(null)

    const handler = await registeredHandler()
    await handler({ sender: {} })

    expect(showOpenDialogMock).not.toHaveBeenCalled()
  })

  it("logs unreadable files instead of opening the review", async () => {
    const window = fakeWindow()
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    fromWebContentsMock.mockReturnValue(window)
    showOpenDialogMock.mockResolvedValue({ canceled: false, filePaths: ["/tmp/broken.ics"] })
    parseIcsImportFileMock.mockRejectedValue(new Error("bad file"))

    const handler = await registeredHandler()
    await handler({ sender: {} })
    vi.runAllTimers()

    expect(window.webContents.send).not.toHaveBeenCalled()
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })
})
