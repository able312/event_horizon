import { beforeEach, describe, expect, it, vi } from "vitest"

const handleMock = vi.fn()
const searchMock = vi.fn()
const createMock = vi.fn()
const importFromCalendarMock = vi.fn()
const getByMonthRangeMock = vi.fn()
const getByCalendarIdsMock = vi.fn()

vi.mock("electron", () => ({
  ipcMain: {
    handle: handleMock,
  },
}))

vi.mock("../db/repository/events.js", () => ({
  default: {
    getAll: vi.fn(),
    getByMonthRange: getByMonthRangeMock,
    getByCalendarIds: getByCalendarIdsMock,
    importFromCalendar: importFromCalendarMock,
    getUnscheduled: vi.fn(),
    getById: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    search: searchMock,
  },
}))

vi.mock("../services/eventCreationService.js", () => ({
  default: { create: createMock },
}))

describe("registerEventsIpcHandlers", () => {
  beforeEach(() => {
    handleMock.mockReset()
    searchMock.mockReset()
    createMock.mockReset()
    importFromCalendarMock.mockReset()
    getByMonthRangeMock.mockReset()
    getByCalendarIdsMock.mockReset()
    vi.spyOn(console, "error").mockImplementation(() => undefined)
  })

  async function getHandler(channel: string) {
    const { registerEventsIpcHandlers } = await import("./eventsHandler.js")
    registerEventsIpcHandlers()
    const handler = handleMock.mock.calls.find((entry) => entry[0] === channel)?.[1]
    if (typeof handler !== "function") throw new Error(`No handler registered for ${channel}`)
    return handler as (...args: unknown[]) => Promise<unknown>
  }

  const importRow = {
    calendarId: " uid-1 ",
    title: "Summer Open",
    startDateTime: "2026-06-14T17:00:00.000Z",
    endDateTime: "2026-06-14T18:00:00.000Z",
  }

  it("validates calendar import rows and forwards them to the repository", async () => {
    const handler = await getHandler("events:import-ics:insert")
    const expected = { inserted: [], duplicateCalendarIds: [] }
    importFromCalendarMock.mockReturnValueOnce(expected)

    await expect(handler({}, [importRow])).resolves.toEqual(expected)
    expect(importFromCalendarMock).toHaveBeenCalledWith([
      { ...importRow, calendarId: "uid-1", internalNotes: null },
    ])
  })

  it.each([
    ["a non-array payload", { rows: [] }],
    ["a row without a calendar id", [{ ...importRow, calendarId: "" }]],
    ["a row with an invalid start", [{ ...importRow, startDateTime: "not a date" }]],
    ["a row with non-string notes", [{ ...importRow, internalNotes: 42 }]],
  ])("rejects %s without touching the repository", async (_label, payload) => {
    const handler = await getHandler("events:import-ics:insert")

    await expect(handler({}, payload)).rejects.toThrow()
    expect(importFromCalendarMock).not.toHaveBeenCalled()
  })

  it("validates the start range before querying", async () => {
    const handler = await getHandler("events:get-by-start-range")
    getByMonthRangeMock.mockReturnValueOnce([])

    await expect(handler({}, "2026-06-13T00:00:00.000Z", "2026-06-16T00:00:00.000Z")).resolves.toEqual([])
    expect(getByMonthRangeMock).toHaveBeenCalledWith("2026-06-13T00:00:00.000Z", "2026-06-16T00:00:00.000Z")

    await expect(handler({}, "yesterday", "2026-06-16T00:00:00.000Z")).rejects.toThrow()
    expect(getByMonthRangeMock).toHaveBeenCalledTimes(1)
  })

  it("requires calendar ids to be a list of strings", async () => {
    const handler = await getHandler("events:get-by-calendar-ids")
    getByCalendarIdsMock.mockReturnValueOnce([])

    await expect(handler({}, ["uid-1"])).resolves.toEqual([])
    await expect(handler({}, "uid-1")).rejects.toThrow()
    expect(getByCalendarIdsMock).toHaveBeenCalledTimes(1)
  })

  it("forwards events:post and its optional client to the event creation service", async () => {
    const { registerEventsIpcHandlers } = await import("./eventsHandler.js")
    registerEventsIpcHandlers()

    const handler = handleMock.mock.calls.find((entry) => entry[0] === "events:post")?.[1] as
      | ((...args: unknown[]) => Promise<unknown>)
      | undefined

    const newEvent = { title: "Smith Wedding" }
    const client = { firstName: "Jane", lastName: "Smith" }
    createMock.mockReturnValueOnce({ id: "event-1" })

    await expect(handler?.({}, newEvent, client)).resolves.toEqual({ id: "event-1" })
    expect(createMock).toHaveBeenCalledWith(newEvent, client)
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
