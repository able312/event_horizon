import { beforeEach, describe, expect, it, vi } from "vitest"

const handleMock = vi.fn()
const getByEventId = vi.fn()
const getIncompleteWithEvent = vi.fn()
const getIncompleteByEventId = vi.fn()
const insert = vi.fn()
const update = vi.fn()
const deleteFn = vi.fn()
const seedCommon = vi.fn()

vi.mock("electron", () => ({
  ipcMain: {
    handle: handleMock,
  },
}))

vi.mock("../db/repository/touchpoints.js", () => ({
  default: {
    getByEventId,
    getIncompleteWithEvent,
    getIncompleteByEventId,
    insert,
    update,
    delete: deleteFn,
    seedCommon,
  },
}))

describe("registerTouchpointsIpcHandlers", () => {
  beforeEach(() => {
    handleMock.mockReset()
    getByEventId.mockReset()
    getIncompleteWithEvent.mockReset()
    getIncompleteByEventId.mockReset()
    insert.mockReset()
    update.mockReset()
    deleteFn.mockReset()
    seedCommon.mockReset()
  })

  it("registers expected channels and routes to the repository", async () => {
    const { registerTouchpointsIpcHandlers } = await import("./touchpointsHandler.js")
    registerTouchpointsIpcHandlers()

    const channels = handleMock.mock.calls.map((entry) => entry[0])
    expect(channels).toEqual(
      expect.arrayContaining([
        "touchpoints:get-many-by-event-id",
        "touchpoints:get-many-incomplete",
        "touchpoints:get-incomplete-by-event-id",
        "touchpoints:post",
        "touchpoints:patch",
        "touchpoints:delete",
        "touchpoints:seed-common",
      ]),
    )

    const byEvent = handleMock.mock.calls.find(
      (entry) => entry[0] === "touchpoints:get-many-by-event-id",
    )?.[1] as (event: unknown, eventId: string) => Promise<unknown>

    getByEventId.mockReturnValueOnce([{ id: "tp-1" }])
    await expect(byEvent({}, "event-1")).resolves.toEqual([{ id: "tp-1" }])
    expect(getByEventId).toHaveBeenCalledWith("event-1")

    const seed = handleMock.mock.calls.find(
      (entry) => entry[0] === "touchpoints:seed-common",
    )?.[1] as (event: unknown, eventId: string) => Promise<unknown>

    seedCommon.mockReturnValueOnce([{ id: "a" }, { id: "b" }, { id: "c" }])
    await expect(seed({}, "event-1")).resolves.toHaveLength(3)
    expect(seedCommon).toHaveBeenCalledWith("event-1")
  })
})
