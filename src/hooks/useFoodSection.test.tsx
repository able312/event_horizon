import { act, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import * as foodItemsIpc from "~/lib/ipc/foodItems"
import { renderHookWithProviders } from "~/test/renderHookWithProviders"
import { useFoodSection } from "./useFoodSection"

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router")
  return {
    ...actual,
    useParams: () => ({ id: "event-1" }),
  }
})

vi.mock("./useTimeblockMutations", () => ({
  useTimeblockMutations: () => ({
    addTimeblock: vi.fn(),
    updateTimeblock: vi.fn(),
    removeTimeblock: vi.fn(),
  }),
}))

vi.mock("~/lib/ipc/foodItems", () => ({
  getFoodSectionWithItems: vi.fn(),
  createFoodItem: vi.fn(),
  updateFoodItem: vi.fn(),
  deleteFoodItem: vi.fn(),
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

function makeTimeblock(overrides: Partial<TimeblockWithItems> = {}): TimeblockWithItems {
  return {
    id: "tb-1",
    eventId: "event-1",
    title: "Food",
    time: "10:00",
    sectionType: "food",
    assignedTo: null,
    createdAt: "created",
    updatedAt: null,
    foodItems: [
      {
        id: "food-1",
        timeblockId: "tb-1",
        name: "Sandwiches",
        quantity: 1,
        serviceStyle: "Buffet",
        includes: "Condiments",
        unitPriceCents: 1200,
      },
    ],
    ...overrides,
    details: overrides.details ?? null,
  }
}

afterEach(() => {
  vi.clearAllMocks()
})

describe("useFoodSection optimistic cache", () => {
  it("optimistic add inserts into foodItems and replaces temp id on success", async () => {
    const getSectionMock = vi.mocked(foodItemsIpc.getFoodSectionWithItems)
    const createItemMock = vi.mocked(foodItemsIpc.createFoodItem)

    const createdItem = {
      id: "food-2",
      timeblockId: "tb-1",
      name: "Salads",
      quantity: 2,
      serviceStyle: null,
      includes: null,
      unitPriceCents: null,
    }

    getSectionMock
      .mockResolvedValueOnce([makeTimeblock()])
      .mockResolvedValue([makeTimeblock({
        foodItems: [
          makeTimeblock().foodItems![0],
          createdItem,
        ],
      })])
    const deferredCreate = createDeferred<ReturnType<typeof foodItemsIpc.createFoodItem> extends Promise<infer R> ? R : never>()
    createItemMock.mockReturnValue(deferredCreate.promise)

    const { result, queryClient } = renderHookWithProviders(() => useFoodSection())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    act(() => {
      result.current.addItem({
        timeblockId: "tb-1",
        newItem: { name: "Salads", quantity: 2 },
      })
    })

    await waitFor(() => {
      const cached = queryClient.getQueryData<TimeblockWithItems[]>(["foodSection", "event-1"])
      expect(cached?.[0].foodItems?.map((item) => item.name)).toEqual(["Sandwiches", "Salads"])
      expect((cached?.[0] as TimeblockWithItems & { items?: unknown }).items).toBeUndefined()
    })

    await act(async () => {
      deferredCreate.resolve(createdItem)
      await deferredCreate.promise
    })

    await waitFor(() => {
      const cached = queryClient.getQueryData<TimeblockWithItems[]>(["foodSection", "event-1"])
      expect(cached?.[0].foodItems?.map((item) => item.id)).toEqual(["food-1", "food-2"])
      expect(cached?.[0].foodItems?.some((item) => item.id.startsWith("temp_"))).toBe(false)
    })
  })

  it("optimistic update changes foodItems[n], not items", async () => {
    const getSectionMock = vi.mocked(foodItemsIpc.getFoodSectionWithItems)
    const updateItemMock = vi.mocked(foodItemsIpc.updateFoodItem)

    getSectionMock.mockResolvedValue([makeTimeblock()])
    const deferredUpdate = createDeferred<ReturnType<typeof foodItemsIpc.updateFoodItem> extends Promise<infer R> ? R : never>()
    updateItemMock.mockReturnValue(deferredUpdate.promise)

    const { result, queryClient } = renderHookWithProviders(() => useFoodSection())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    act(() => {
      result.current.updateItem({
        timeblockId: "tb-1",
        itemId: "food-1",
        updates: { name: "Wraps" },
      })
    })

    await waitFor(() => {
      const cached = queryClient.getQueryData<TimeblockWithItems[]>(["foodSection", "event-1"])
      expect(cached?.[0].foodItems?.[0].name).toBe("Wraps")
      expect((cached?.[0] as TimeblockWithItems & { items?: unknown }).items).toBeUndefined()
    })

    deferredUpdate.resolve({
      id: "food-1",
      timeblockId: "tb-1",
      name: "Wraps",
      quantity: 1,
      serviceStyle: "Buffet",
      includes: "Condiments",
      unitPriceCents: 1200,
    })
  })

  it("optimistic delete removes from foodItems, not items", async () => {
    const getSectionMock = vi.mocked(foodItemsIpc.getFoodSectionWithItems)
    const deleteItemMock = vi.mocked(foodItemsIpc.deleteFoodItem)

    getSectionMock.mockResolvedValue([
      makeTimeblock({
        foodItems: [
          {
            id: "food-1",
            timeblockId: "tb-1",
            name: "Sandwiches",
            quantity: 1,
            serviceStyle: "Buffet",
            includes: "Condiments",
            unitPriceCents: 1200,
          },
          {
            id: "food-2",
            timeblockId: "tb-1",
            name: "Salads",
            quantity: 1,
            serviceStyle: "Buffet",
            includes: "Dressing",
            unitPriceCents: 900,
          },
        ],
      }),
    ])
    const deferredDelete = createDeferred<boolean>()
    deleteItemMock.mockReturnValue(deferredDelete.promise)

    const { result, queryClient } = renderHookWithProviders(() => useFoodSection())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    act(() => {
      result.current.removeItem({
        timeblockId: "tb-1",
        itemId: "food-1",
      })
    })

    await waitFor(() => {
      const cached = queryClient.getQueryData<TimeblockWithItems[]>(["foodSection", "event-1"])
      expect(cached?.[0].foodItems?.map((item) => item.id)).toEqual(["food-2"])
      expect((cached?.[0] as TimeblockWithItems & { items?: unknown }).items).toBeUndefined()
    })

    deferredDelete.resolve(true)
  })

  it("rolls cache back to previous state when mutation fails", async () => {
    const getSectionMock = vi.mocked(foodItemsIpc.getFoodSectionWithItems)
    const createItemMock = vi.mocked(foodItemsIpc.createFoodItem)

    const initialData = [makeTimeblock()]
    getSectionMock.mockResolvedValue(initialData)
    createItemMock.mockRejectedValue(new Error("create failed"))

    const { result, queryClient } = renderHookWithProviders(() => useFoodSection())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    act(() => {
      result.current.addItem({
        timeblockId: "tb-1",
        newItem: { name: "Salads" },
      })
    })

    await waitFor(() => {
      const cached = queryClient.getQueryData<TimeblockWithItems[]>(["foodSection", "event-1"])
      expect(cached).toEqual(initialData)
    })
  })
})
