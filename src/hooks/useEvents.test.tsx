import { act, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { Event, NewEvent } from "~/definitions/database"
import * as eventsApi from "~/lib/data/events"
import { renderHookWithProviders } from "~/test/renderHookWithProviders"
import { eventKeys } from "~/lib/data/queries"
import { useEvents } from "./useEvents"
import { useEventsMonthQuery } from "./useEventsMonthQuery"

vi.mock("~/lib/data/events", () => ({
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

  it("createEvent returns a promise, shows the event optimistically and leaves refreshing to live queries", async () => {
    const getEventsByMonthMock = vi.mocked(eventsApi.getEventsByMonth)
    const getUnscheduledEventsMock = vi.mocked(eventsApi.getUnscheduledEvents)
    const createEventMock = vi.mocked(eventsApi.createEvent)

    getEventsByMonthMock.mockResolvedValue([makeEvent()])
    getUnscheduledEventsMock.mockResolvedValue([])

    const deferredCreate = createDeferred<Event>()
    createEventMock.mockReturnValue(deferredCreate.promise)

    const { result, queryClient } = renderHookWithProviders(() => useEvents("2026-04"))
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
    await waitFor(() =>
      expect(queryClient.getQueryData<Event[]>(eventKeys.month("2026-04"))?.map((event) => event.title))
        .toEqual(["Event 1", "Created Event"]),
    )

    await act(async () => {
      deferredCreate.resolve(makeEvent({ id: "event-created", title: "Created Event" }))
      await expect(createPromise).resolves.toMatchObject({ id: "event-created" })
    })

    expect(getEventsByMonthMock).toHaveBeenCalledTimes(1)
    expect(getUnscheduledEventsMock).toHaveBeenCalledTimes(1)
  })

  it("createEvent forwards the new client without refreshing primary clients", async () => {
    vi.mocked(eventsApi.getEventsByMonth).mockResolvedValue([makeEvent()])
    vi.mocked(eventsApi.getUnscheduledEvents).mockResolvedValue([])
    const createEventMock = vi.mocked(eventsApi.createEvent)
    createEventMock.mockResolvedValue(makeEvent({ id: "event-created" }))

    const { result, queryClient } = renderHookWithProviders(() => useEvents("2026-04"))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    const newEvent = { title: "Created Event", startDateTime: "2026-04-20T12:00:00.000Z" } as NewEvent
    const client = { firstName: "Jane", lastName: "Smith", email: "jane@example.com" }

    await act(async () => {
      await result.current.createEvent(newEvent, client)
    })

    expect(createEventMock).toHaveBeenCalledWith(newEvent, client)
    expect(invalidateSpy).not.toHaveBeenCalled()
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

  it("optimistically updates the single-event cache and requests no refresh", async () => {
    const getEventsByMonthMock = vi.mocked(eventsApi.getEventsByMonth)
    const getUnscheduledEventsMock = vi.mocked(eventsApi.getUnscheduledEvents)
    const updateEventMock = vi.mocked(eventsApi.updateEvent)
    const deferredUpdate = createDeferred<Event>()

    getEventsByMonthMock.mockResolvedValue([makeEvent()])
    getUnscheduledEventsMock.mockResolvedValue([])
    updateEventMock.mockReturnValue(deferredUpdate.promise)

    const { result, queryClient } = renderHookWithProviders(() => useEvents("2026-04"))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    queryClient.setQueryData(["event", "event-1"], makeEvent({ title: "Old Title" }))
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    const updatePromise = result.current.updateEvent({
      id: "event-1",
      updates: { title: "New Title", minGuests: 10, maxGuests: 20 },
    })

    await waitFor(() => {
      const cached = queryClient.getQueryData<Event>(["event", "event-1"])
      expect(cached?.title).toBe("New Title")
      expect(cached?.minGuests).toBe(10)
      expect(cached?.maxGuests).toBe(20)
    })

    await act(async () => {
      deferredUpdate.resolve(
        makeEvent({
          title: "New Title",
          minGuests: 10,
          maxGuests: 20,
        }),
      )
      await expect(updatePromise).resolves.toBeTruthy()
    })

    expect(queryClient.getQueryData<Event>(["event", "event-1"])?.title).toBe("New Title")
    expect(invalidateSpy).not.toHaveBeenCalled()
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
    queryClient.setQueryData(["event", "event-1"], makeEvent({ title: "Old Title" }))

    await expect(
      result.current.updateEvent({
        id: "event-1",
        updates: { title: "Broken Title" },
      }),
    ).rejects.toThrow("update failed")

    const cached = queryClient.getQueryData<Event>(["event", "event-1"])
    expect(cached?.title).toBe("Old Title")
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

  it("removes the single-event cache on delete and requests no refresh", async () => {
    const getEventsByMonthMock = vi.mocked(eventsApi.getEventsByMonth)
    const getUnscheduledEventsMock = vi.mocked(eventsApi.getUnscheduledEvents)
    const deleteEventMock = vi.mocked(eventsApi.deleteEvent)
    const deferredDelete = createDeferred<boolean>()

    getEventsByMonthMock.mockResolvedValue([makeEvent()])
    getUnscheduledEventsMock.mockResolvedValue([])
    deleteEventMock.mockReturnValue(deferredDelete.promise)

    const { result, queryClient } = renderHookWithProviders(() => useEvents("2026-04"))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    queryClient.setQueryData(["event", "event-1"], makeEvent({ title: "Old Title" }))
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    const deletePromise = result.current.deleteEvent("event-1")
    await waitFor(() => {
      expect(queryClient.getQueryData(["event", "event-1"])).toBeUndefined()
    })

    await act(async () => {
      deferredDelete.resolve(true)
      await expect(deletePromise).resolves.toBe(true)
    })

    expect(invalidateSpy).not.toHaveBeenCalled()
    expect(getEventsByMonthMock).toHaveBeenCalledTimes(1)
  })
})
