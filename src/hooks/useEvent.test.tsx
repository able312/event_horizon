import { act, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { Event } from "~/definitions/database"
import * as eventsApi from "~/lib/ipc/ipcEventsQueries"
import { renderHookWithProviders } from "~/test/renderHookWithProviders"
import { EVENTS_SEARCH_QUERY_KEY_PREFIX } from "./eventsCache"
import { useEvent } from "./useEvent"

const navigateMock = vi.fn()

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router")
  return {
    ...actual,
    useParams: () => ({ id: "event-1" }),
    useNavigate: () => navigateMock,
  }
})

vi.mock("~/lib/ipc/ipcEventsQueries", () => ({
  getAllEvents: vi.fn(),
  getEventById: vi.fn(),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
}))

function createDeferred<T>() {
  let resolve: (value: T | PromiseLike<T>) => void = () => undefined
  let reject: (reason?: unknown) => void = () => undefined
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "event-1",
    title: "Event 1",
    type: "function",
    status: "new_lead",
    createdAt: "created",
    updatedAt: null,
    ...overrides,
  } as Event
}

afterEach(() => {
  vi.clearAllMocks()
})

describe("useEvent async mutation contract", () => {
  it("updateEvent returns a promise and resolves server result", async () => {
    const getEventByIdMock = vi.mocked(eventsApi.getEventById)
    const updateEventMock = vi.mocked(eventsApi.updateEvent)

    getEventByIdMock.mockResolvedValue(makeEvent())
    const deferredUpdate = createDeferred<Event>()
    updateEventMock.mockReturnValue(deferredUpdate.promise)

    const { result } = renderHookWithProviders(() => useEvent())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const updatePromise = result.current.updateEvent({ title: "Updated title" })
    expect(typeof updatePromise.then).toBe("function")

    await act(async () => {
      deferredUpdate.resolve(makeEvent({ title: "Updated title" }))
      await expect(updatePromise).resolves.toMatchObject({ title: "Updated title" })
    })
  })

  it("deleteEvent resolves and navigates to /events on success", async () => {
    const getEventByIdMock = vi.mocked(eventsApi.getEventById)
    const deleteEventMock = vi.mocked(eventsApi.deleteEvent)

    getEventByIdMock.mockResolvedValue(makeEvent())
    deleteEventMock.mockResolvedValue(true)

    const { result } = renderHookWithProviders(() => useEvent())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    await act(async () => {
      await expect(result.current.deleteEvent()).resolves.toBe(true)
    })

    expect(navigateMock).toHaveBeenCalledWith("/events")
  })

  it("deleteEvent rejects and does not navigate on failure", async () => {
    const getEventByIdMock = vi.mocked(eventsApi.getEventById)
    const deleteEventMock = vi.mocked(eventsApi.deleteEvent)

    getEventByIdMock.mockResolvedValue(makeEvent())
    deleteEventMock.mockRejectedValue(new Error("delete failed"))

    const { result } = renderHookWithProviders(() => useEvent())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    await act(async () => {
      await expect(result.current.deleteEvent()).rejects.toThrow("delete failed")
    })

    expect(navigateMock).not.toHaveBeenCalled()
  })

  it("invalidates event search queries after successful update", async () => {
    const getEventByIdMock = vi.mocked(eventsApi.getEventById)
    const updateEventMock = vi.mocked(eventsApi.updateEvent)

    getEventByIdMock.mockResolvedValue(makeEvent())
    updateEventMock.mockResolvedValue(makeEvent({ title: "Updated title" }))

    const { result, queryClient } = renderHookWithProviders(() => useEvent())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    await act(async () => {
      await result.current.updateEvent({ title: "Updated title" })
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: EVENTS_SEARCH_QUERY_KEY_PREFIX })
  })
})
