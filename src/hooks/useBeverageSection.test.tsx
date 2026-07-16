import { act, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import * as beverageItemsIpc from "~/lib/ipc/beverageItems"
import { renderHookWithProviders } from "~/test/renderHookWithProviders"
import { useBeverageSection } from "./useBeverageSection"

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

vi.mock("~/lib/ipc/beverageItems", () => ({
  getBeverageSectionWithItems: vi.fn(),
  createBeverageItem: vi.fn(),
  updateBeverageItem: vi.fn(),
  deleteBeverageItem: vi.fn(),
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
    title: "Drinks",
    time: "10:00",
    sectionType: "beverage",
    assignedTo: null,
    createdAt: "created",
    updatedAt: null,
    beverageItems: [
      {
        id: "bev-1",
        timeblockId: "tb-1",
        name: "Coffee",
        quantity: 1,
        type: "Hot",
        serviceStyle: "Consumption Bar",
        includes: "Cream",
        unitPriceCents: 300,
      },
    ],
    ...overrides,
    details: overrides.details ?? null,
  }
}

afterEach(() => {
  vi.clearAllMocks()
})

describe("useBeverageSection optimistic cache", () => {
  it("optimistic add inserts into beverageItems and replaces temp id on success", async () => {
    const getSectionMock = vi.mocked(beverageItemsIpc.getBeverageSectionWithItems)
    const createItemMock = vi.mocked(beverageItemsIpc.createBeverageItem)

    const createdItem = {
      id: "bev-2",
      timeblockId: "tb-1",
      name: "Tea",
      quantity: 2,
      type: null,
      serviceStyle: null,
      includes: null,
      unitPriceCents: null,
    }

    getSectionMock
      .mockResolvedValueOnce([makeTimeblock()])
      .mockResolvedValue([makeTimeblock({
        beverageItems: [
          makeTimeblock().beverageItems![0],
          createdItem,
        ],
      })])
    const deferredCreate = createDeferred<ReturnType<typeof beverageItemsIpc.createBeverageItem> extends Promise<infer R> ? R : never>()
    createItemMock.mockReturnValue(deferredCreate.promise)

    const { result, queryClient } = renderHookWithProviders(() => useBeverageSection())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    act(() => {
      result.current.addItem({
        timeblockId: "tb-1",
        newItem: { name: "Tea", quantity: 2 },
      })
    })

    await waitFor(() => {
      const cached = queryClient.getQueryData<TimeblockWithItems[]>(["beverageSection", "event-1"])
      expect(cached?.[0].beverageItems?.map((item) => item.name)).toEqual(["Coffee", "Tea"])
      expect((cached?.[0] as TimeblockWithItems & { items?: unknown }).items).toBeUndefined()
    })

    await act(async () => {
      deferredCreate.resolve(createdItem)
      await deferredCreate.promise
    })

    await waitFor(() => {
      const cached = queryClient.getQueryData<TimeblockWithItems[]>(["beverageSection", "event-1"])
      expect(cached?.[0].beverageItems?.map((item) => item.id)).toEqual(["bev-1", "bev-2"])
      expect(cached?.[0].beverageItems?.some((item) => item.id.startsWith("temp_"))).toBe(false)
    })
  })

  it("optimistic update changes beverageItems[n], not items", async () => {
    const getSectionMock = vi.mocked(beverageItemsIpc.getBeverageSectionWithItems)
    const updateItemMock = vi.mocked(beverageItemsIpc.updateBeverageItem)

    getSectionMock.mockResolvedValue([makeTimeblock()])
    const deferredUpdate = createDeferred<ReturnType<typeof beverageItemsIpc.updateBeverageItem> extends Promise<infer R> ? R : never>()
    updateItemMock.mockReturnValue(deferredUpdate.promise)

    const { result, queryClient } = renderHookWithProviders(() => useBeverageSection())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    act(() => {
      result.current.updateItem({
        timeblockId: "tb-1",
        itemId: "bev-1",
        updates: { name: "Espresso" },
      })
    })

    await waitFor(() => {
      const cached = queryClient.getQueryData<TimeblockWithItems[]>(["beverageSection", "event-1"])
      expect(cached?.[0].beverageItems?.[0].name).toBe("Espresso")
      expect((cached?.[0] as TimeblockWithItems & { items?: unknown }).items).toBeUndefined()
    })

    deferredUpdate.resolve({
      id: "bev-1",
      timeblockId: "tb-1",
      name: "Espresso",
      quantity: 1,
      type: "Hot",
      serviceStyle: "Consumption Bar",
      includes: "Cream",
      unitPriceCents: 300,
    })
  })

  it("optimistic delete removes from beverageItems, not items", async () => {
    const getSectionMock = vi.mocked(beverageItemsIpc.getBeverageSectionWithItems)
    const deleteItemMock = vi.mocked(beverageItemsIpc.deleteBeverageItem)

    getSectionMock.mockResolvedValue([
      makeTimeblock({
        beverageItems: [
          {
            id: "bev-1",
            timeblockId: "tb-1",
            name: "Coffee",
            quantity: 1,
            type: "Hot",
            serviceStyle: "Consumption Bar",
            includes: null,
            unitPriceCents: 300,
          },
          {
            id: "bev-2",
            timeblockId: "tb-1",
            name: "Tea",
            quantity: 1,
            type: "Hot",
            serviceStyle: "Consumption Bar",
            includes: null,
            unitPriceCents: 250,
          },
        ],
      }),
    ])
    const deferredDelete = createDeferred<boolean>()
    deleteItemMock.mockReturnValue(deferredDelete.promise)

    const { result, queryClient } = renderHookWithProviders(() => useBeverageSection())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    act(() => {
      result.current.removeItem({
        timeblockId: "tb-1",
        itemId: "bev-1",
      })
    })

    await waitFor(() => {
      const cached = queryClient.getQueryData<TimeblockWithItems[]>(["beverageSection", "event-1"])
      expect(cached?.[0].beverageItems?.map((item) => item.id)).toEqual(["bev-2"])
      expect((cached?.[0] as TimeblockWithItems & { items?: unknown }).items).toBeUndefined()
    })

    deferredDelete.resolve(true)
  })

  it("rolls cache back to previous state when mutation fails", async () => {
    const getSectionMock = vi.mocked(beverageItemsIpc.getBeverageSectionWithItems)
    const createItemMock = vi.mocked(beverageItemsIpc.createBeverageItem)

    const initialData = [makeTimeblock()]
    getSectionMock.mockResolvedValue(initialData)
    createItemMock.mockRejectedValue(new Error("create failed"))

    const { result, queryClient } = renderHookWithProviders(() => useBeverageSection())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    act(() => {
      result.current.addItem({
        timeblockId: "tb-1",
        newItem: { name: "Latte" },
      })
    })

    await waitFor(() => {
      const cached = queryClient.getQueryData<TimeblockWithItems[]>(["beverageSection", "event-1"])
      expect(cached).toEqual(initialData)
    })
  })
})
