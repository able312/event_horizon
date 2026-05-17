import { act, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { Event, NewEvent } from "~/definitions/database"
import * as eventsApi from "~/lib/ipc/ipcEventsQueries"
import { renderHookWithProviders } from "~/test/renderHookWithProviders"
import { EVENTS_SEARCH_QUERY_KEY_PREFIX } from "./eventsCache"
import { useEvents } from "./useEvents"
import { useEventsMonthQuery } from "./useEventsMonthQuery"

vi.mock("~/lib/ipc/ipcEventsQueries", () => ({
  getAllEvents: vi.fn(),
  getEventsByMonth: vi.fn(),
  getUnscheduledEvents: vi.fn(),
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
    startDateTime: "2026-04-15T12:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: null,
    ...overrides,
  } as Event
}

afterEach(() => {
  vi.clearAllMocks()
})

describe("useEvents month-scoped queries and mutations", () => {
  it("queries month events and unscheduled events with separate keys", async () => {
    const getEventsByMonthMock = vi.mocked(eventsApi.getEventsByMonth)
    const getUnscheduledEventsMock = vi.mocked(eventsApi.getUnscheduledEvents)

    getEventsByMonthMock.mockResolvedValue([makeEvent()])
    getUnscheduledEventsMock.mockResolvedValue([makeEvent({ id: "unscheduled", startDateTime: null })])

    const { result } = renderHookWithProviders(() => useEvents("2026-04"))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(getEventsByMonthMock).toHaveBeenCalledWith("2026-04")
    expect(getUnscheduledEventsMock).toHaveBeenCalledTimes(1)
    expect(result.current.monthEvents).toHaveLength(1)
    expect(result.current.unscheduledEvents).toHaveLength(1)
  })

  it("refetches month query when the selected month changes", async () => {
    const getEventsByMonthMock = vi.mocked(eventsApi.getEventsByMonth)
    const getUnscheduledEventsMock = vi.mocked(eventsApi.getUnscheduledEvents)

    getEventsByMonthMock.mockResolvedValue([])
    getUnscheduledEventsMock.mockResolvedValue([])

    const { rerender } = renderHookWithProviders(
      ({ month }) => useEvents(month),
      { initialProps: { month: "2026-04" } },
    )

    await waitFor(() => {
      expect(getEventsByMonthMock).toHaveBeenCalledWith("2026-04")
    })

    rerender({ month: "2026-05" })

    await waitFor(() => {
      expect(getEventsByMonthMock).toHaveBeenCalledWith("2026-05")
    })
    expect(getUnscheduledEventsMock).toHaveBeenCalledTimes(1)
  })

  it("shares a same-month query cache between main and mini consumers", async () => {
    const getEventsByMonthMock = vi.mocked(eventsApi.getEventsByMonth)
    const getUnscheduledEventsMock = vi.mocked(eventsApi.getUnscheduledEvents)

    getEventsByMonthMock.mockResolvedValue([makeEvent()])
    getUnscheduledEventsMock.mockResolvedValue([])

    const { result } = renderHookWithProviders(() => {
      const main = useEvents("2026-04")
      const mini = useEventsMonthQuery("2026-04", {
        fetchPolicy: "missing-only",
        staleTime: Number.POSITIVE_INFINITY,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
      })

      return { main, mini }
    })

    await waitFor(() => expect(result.current.main.isSuccess).toBe(true))
    await waitFor(() => expect(result.current.mini.monthQuery.isSuccess).toBe(true))

    expect(getEventsByMonthMock).toHaveBeenCalledTimes(1)
    expect(getUnscheduledEventsMock).toHaveBeenCalledTimes(1)
    expect(result.current.main.monthEvents).toEqual(result.current.mini.events)
  })

  it("createEvent returns a promise and invalidates only the affected month scope", async () => {
    const getEventsByMonthMock = vi.mocked(eventsApi.getEventsByMonth)
    const getUnscheduledEventsMock = vi.mocked(eventsApi.getUnscheduledEvents)
    const createEventMock = vi.mocked(eventsApi.createEvent)

    getEventsByMonthMock.mockResolvedValue([makeEvent()])
    getUnscheduledEventsMock.mockResolvedValue([])

    const deferredCreate = createDeferred<Event>()
    createEventMock.mockReturnValue(deferredCreate.promise)

    const { result } = renderHookWithProviders(() => useEvents("2026-04"))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const newEvent = {
      title: "Created Event",
      type: "function",
      status: "new_lead",
      startDateTime: "2026-04-20T12:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
    } as NewEvent

    const createPromise = result.current.createEvent(newEvent)
    expect(typeof createPromise.then).toBe("function")

    await act(async () => {
      deferredCreate.resolve(makeEvent({ id: "event-created", title: "Created Event" }))
      await expect(createPromise).resolves.toMatchObject({ id: "event-created" })
    })

    await waitFor(() => {
      expect(getEventsByMonthMock).toHaveBeenCalledTimes(2)
    })
    expect(getUnscheduledEventsMock).toHaveBeenCalledTimes(1)
  })

  it("updateEvent returns a promise and rejects on mutation failure", async () => {
    const getEventsByMonthMock = vi.mocked(eventsApi.getEventsByMonth)
    const getUnscheduledEventsMock = vi.mocked(eventsApi.getUnscheduledEvents)
    const updateEventMock = vi.mocked(eventsApi.updateEvent)

    getEventsByMonthMock.mockResolvedValue([makeEvent()])
    getUnscheduledEventsMock.mockResolvedValue([])
    updateEventMock.mockRejectedValue(new Error("update failed"))

    const { result } = renderHookWithProviders(() => useEvents("2026-04"))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const updatePromise = result.current.updateEvent({
      id: "event-1",
      updates: { title: "Updated" },
    })
    expect(typeof updatePromise.then).toBe("function")
    await expect(updatePromise).rejects.toThrow("update failed")
  })

  it("invalidates event search queries after update", async () => {
    const getEventsByMonthMock = vi.mocked(eventsApi.getEventsByMonth)
    const getUnscheduledEventsMock = vi.mocked(eventsApi.getUnscheduledEvents)
    const updateEventMock = vi.mocked(eventsApi.updateEvent)

    getEventsByMonthMock.mockResolvedValue([makeEvent()])
    getUnscheduledEventsMock.mockResolvedValue([])
    updateEventMock.mockResolvedValue(makeEvent({ title: "Updated" }))

    const { result, queryClient } = renderHookWithProviders(() => useEvents("2026-04"))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    await act(async () => {
      await result.current.updateEvent({
        id: "event-1",
        updates: { title: "Updated" },
      })
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: EVENTS_SEARCH_QUERY_KEY_PREFIX })
  })

  it("optimistically updates and invalidates single-event cache after update", async () => {
    const getEventsByMonthMock = vi.mocked(eventsApi.getEventsByMonth)
    const getUnscheduledEventsMock = vi.mocked(eventsApi.getUnscheduledEvents)
    const updateEventMock = vi.mocked(eventsApi.updateEvent)
    const deferredUpdate = createDeferred<Event>()

    getEventsByMonthMock.mockResolvedValue([makeEvent()])
    getUnscheduledEventsMock.mockResolvedValue([])
    updateEventMock.mockReturnValue(deferredUpdate.promise)

    const { result, queryClient } = renderHookWithProviders(() => useEvents("2026-04"))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    queryClient.setQueryData(["event", "event-1"], makeEvent({ clientName: "Old Client" }))
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    const updatePromise = result.current.updateEvent({
      id: "event-1",
      updates: { clientName: "New Client", clientEmail: "new@example.com", clientPhone: "123" },
    })

    await waitFor(() => {
      const cached = queryClient.getQueryData<Event>(["event", "event-1"])
      expect(cached?.clientName).toBe("New Client")
      expect(cached?.clientEmail).toBe("new@example.com")
      expect(cached?.clientPhone).toBe("123")
    })

    await act(async () => {
      deferredUpdate.resolve(
        makeEvent({
          clientName: "New Client",
          clientEmail: "new@example.com",
          clientPhone: "123",
        }),
      )
      await expect(updatePromise).resolves.toBeTruthy()
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["event", "event-1"] })
  })

  it("restores single-event cache when update fails", async () => {
    const getEventsByMonthMock = vi.mocked(eventsApi.getEventsByMonth)
    const getUnscheduledEventsMock = vi.mocked(eventsApi.getUnscheduledEvents)
    const updateEventMock = vi.mocked(eventsApi.updateEvent)

    getEventsByMonthMock.mockResolvedValue([makeEvent()])
    getUnscheduledEventsMock.mockResolvedValue([])
    updateEventMock.mockRejectedValue(new Error("update failed"))

    const { result, queryClient } = renderHookWithProviders(() => useEvents("2026-04"))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    queryClient.setQueryData(["event", "event-1"], makeEvent({ clientName: "Old Client" }))

    await expect(
      result.current.updateEvent({
        id: "event-1",
        updates: { clientName: "Broken Client" },
      }),
    ).rejects.toThrow("update failed")

    const cached = queryClient.getQueryData<Event>(["event", "event-1"])
    expect(cached?.clientName).toBe("Old Client")
  })

  it("deleteEvent returns a promise and resolves boolean result", async () => {
    const getEventsByMonthMock = vi.mocked(eventsApi.getEventsByMonth)
    const getUnscheduledEventsMock = vi.mocked(eventsApi.getUnscheduledEvents)
    const deleteEventMock = vi.mocked(eventsApi.deleteEvent)

    getEventsByMonthMock.mockResolvedValue([makeEvent()])
    getUnscheduledEventsMock.mockResolvedValue([])
    const deferredDelete = createDeferred<boolean>()
    deleteEventMock.mockReturnValue(deferredDelete.promise)

    const { result } = renderHookWithProviders(() => useEvents("2026-04"))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const deletePromise = result.current.deleteEvent("event-1")
    expect(typeof deletePromise.then).toBe("function")

    await act(async () => {
      deferredDelete.resolve(true)
      await expect(deletePromise).resolves.toBe(true)
    })
  })

  it("removes and invalidates single-event cache after delete", async () => {
    const getEventsByMonthMock = vi.mocked(eventsApi.getEventsByMonth)
    const getUnscheduledEventsMock = vi.mocked(eventsApi.getUnscheduledEvents)
    const deleteEventMock = vi.mocked(eventsApi.deleteEvent)
    const deferredDelete = createDeferred<boolean>()

    getEventsByMonthMock.mockResolvedValue([makeEvent()])
    getUnscheduledEventsMock.mockResolvedValue([])
    deleteEventMock.mockReturnValue(deferredDelete.promise)

    const { result, queryClient } = renderHookWithProviders(() => useEvents("2026-04"))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    queryClient.setQueryData(["event", "event-1"], makeEvent({ clientName: "Old Client" }))
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    const deletePromise = result.current.deleteEvent("event-1")
    await waitFor(() => {
      expect(queryClient.getQueryData(["event", "event-1"])).toBeUndefined()
    })

    await act(async () => {
      deferredDelete.resolve(true)
      await expect(deletePromise).resolves.toBe(true)
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["event", "event-1"] })
  })
})
