import { beforeEach, describe, expect, it, vi } from "vitest"

const handleMock = vi.fn()
const searchMock = vi.fn()

vi.mock("electron", () => ({
  ipcMain: {
    handle: handleMock,
  },
}))

vi.mock("../db/repository/events.js", () => ({
  default: {
    getAll: vi.fn(),
    getByMonthRange: vi.fn(),
    getUnscheduled: vi.fn(),
    getById: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    search: searchMock,
  },
}))

vi.mock("../services/icsImportService.js", () => ({
  commitIcsImport: vi.fn(),
}))

describe("registerEventsIpcHandlers", () => {
  beforeEach(() => {
    handleMock.mockReset()
    searchMock.mockReset()
  })

  it("registers events:search and forwards payload to repository", async () => {
    const { registerEventsIpcHandlers } = await import("./eventsHandler.js")
    registerEventsIpcHandlers()

    const call = handleMock.mock.calls.find((entry) => entry[0] === "events:search")
    expect(call).toBeTruthy()

    const handler = call?.[1] as ((...args: unknown[]) => Promise<unknown>) | undefined
    expect(typeof handler).toBe("function")

    const payload = {
      query: "alpha",
      type: null,
      status: null,
      startFrom: null,
      startTo: null,
      page: 0,
      pageSize: 50,
    }
    const expected = { items: [], total: 0, page: 0, pageSize: 50, hasMore: false }
    searchMock.mockReturnValueOnce(expected)

    const result = await handler?.({}, payload)
    expect(searchMock).toHaveBeenCalledWith(payload)
    expect(result).toEqual(expected)
  })
})
