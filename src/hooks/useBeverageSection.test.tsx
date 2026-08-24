import { act, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { BeverageSectionPayload } from "~/definitions/beverage/beverage-types"
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
  setBeverageItemTimeblocks: vi.fn(),
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

function makeSection(overrides: Partial<BeverageSectionPayload> = {}): BeverageSectionPayload {
  return {
    timeblocks: [
      {
        id: "tb-1",
        eventId: "event-1",
        title: "Drinks",
        time: "10:00",
        sectionType: "beverage",
        assignedTo: null,
        createdAt: "created",
        updatedAt: null,
        details: null,
      },
    ],
    items: [
      {
        id: "bev-1",
        eventId: "event-1",
        name: "Coffee",
        quantity: 1,
        type: "Beer",
        serviceStyle: "Consumption Bar",
        includes: "Cream",
        unitPriceCents: 300,
        assignedTimeblockIds: ["tb-1"],
      },
    ],
    ...overrides,
  }
}

afterEach(() => {
  vi.clearAllMocks()
})

describe("useBeverageSection optimistic cache", () => {
  it("optimistic add inserts into items and replaces temp id on success", async () => {
    const getSectionMock = vi.mocked(beverageItemsIpc.getBeverageSectionWithItems)
    const createItemMock = vi.mocked(beverageItemsIpc.createBeverageItem)

    const createdItem = {
      id: "bev-2",
      eventId: "event-1",
      name: "Tea",
      quantity: 2,
      type: "Wine" as const,
      serviceStyle: null,
      includes: null,
      unitPriceCents: null,
    }

    getSectionMock
      .mockResolvedValueOnce(makeSection())
      .mockResolvedValue(makeSection({
        items: [
          makeSection().items[0],
          { ...createdItem, assignedTimeblockIds: [] },
        ],
      }))
    const deferredCreate = createDeferred<typeof createdItem>()
    createItemMock.mockReturnValue(deferredCreate.promise)

    const { result, queryClient } = renderHookWithProviders(() => useBeverageSection())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    act(() => {
      result.current.addItem({
        type: "Wine",
        newItem: { name: "Tea" },
      })
    })

    await waitFor(() => {
      const cached = queryClient.getQueryData<BeverageSectionPayload>(["beverageSection", "event-1"])
      expect(cached?.items.map((item) => item.name)).toEqual(["Coffee", "Tea"])
    })

    await act(async () => {
      deferredCreate.resolve(createdItem)
      await deferredCreate.promise
    })

    await waitFor(() => {
      const cached = queryClient.getQueryData<BeverageSectionPayload>(["beverageSection", "event-1"])
      expect(cached?.items.map((item) => item.id)).toEqual(["bev-1", "bev-2"])
      expect(cached?.items.some((item) => item.id.startsWith("temp_"))).toBe(false)
    })
  })

  it("uses a client-supplied id for optimistic add and keeps it after success", async () => {
    const getSectionMock = vi.mocked(beverageItemsIpc.getBeverageSectionWithItems)
    const createItemMock = vi.mocked(beverageItemsIpc.createBeverageItem)

    const clientId = "client-bev-id"
    const createdItem = {
      id: clientId,
      eventId: "event-1",
      name: "Rosé",
      quantity: null,
      type: "Wine" as const,
      serviceStyle: null,
      includes: null,
      unitPriceCents: null,
    }

    getSectionMock
      .mockResolvedValueOnce(makeSection())
      .mockResolvedValue(makeSection({
        items: [
          makeSection().items[0],
          { ...createdItem, assignedTimeblockIds: [] },
        ],
      }))
    const deferredCreate = createDeferred<typeof createdItem>()
    createItemMock.mockReturnValue(deferredCreate.promise)

    const { result, queryClient } = renderHookWithProviders(() => useBeverageSection())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    act(() => {
      result.current.addItem({
        id: clientId,
        type: "Wine",
        newItem: { name: "Rosé" },
      })
    })

    await waitFor(() => {
      const cached = queryClient.getQueryData<BeverageSectionPayload>(["beverageSection", "event-1"])
      expect(cached?.items.map((item) => item.id)).toEqual(["bev-1", clientId])
    })

    await act(async () => {
      deferredCreate.resolve(createdItem)
      await deferredCreate.promise
    })

    await waitFor(() => {
      const cached = queryClient.getQueryData<BeverageSectionPayload>(["beverageSection", "event-1"])
      expect(cached?.items.map((item) => item.id)).toEqual(["bev-1", clientId])
      expect(cached?.items.some((item) => item.id.startsWith("temp_"))).toBe(false)
    })

    expect(createItemMock).toHaveBeenCalledWith(expect.objectContaining({ id: clientId }))
  })

  it("optimistic update changes items[n]", async () => {
    const getSectionMock = vi.mocked(beverageItemsIpc.getBeverageSectionWithItems)
    const updateItemMock = vi.mocked(beverageItemsIpc.updateBeverageItem)

    getSectionMock.mockResolvedValue(makeSection())
    const deferredUpdate = createDeferred<ReturnType<typeof beverageItemsIpc.updateBeverageItem> extends Promise<infer R> ? R : never>()
    updateItemMock.mockReturnValue(deferredUpdate.promise)

    const { result, queryClient } = renderHookWithProviders(() => useBeverageSection())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    act(() => {
      result.current.updateItem({
        itemId: "bev-1",
        updates: { name: "Espresso" },
      })
    })

    await waitFor(() => {
      const cached = queryClient.getQueryData<BeverageSectionPayload>(["beverageSection", "event-1"])
      expect(cached?.items[0]?.name).toBe("Espresso")
    })

    deferredUpdate.resolve({
      id: "bev-1",
      eventId: "event-1",
      name: "Espresso",
      quantity: 1,
      type: "Beer",
      serviceStyle: "Consumption Bar",
      includes: "Cream",
      unitPriceCents: 300,
    })
  })

  it("optimistic delete removes from items", async () => {
    const getSectionMock = vi.mocked(beverageItemsIpc.getBeverageSectionWithItems)
    const deleteItemMock = vi.mocked(beverageItemsIpc.deleteBeverageItem)

    getSectionMock.mockResolvedValue(makeSection({
      items: [
        makeSection().items[0],
        {
          id: "bev-2",
          eventId: "event-1",
          name: "Tea",
          quantity: 1,
          type: "Wine",
          serviceStyle: null,
          includes: null,
          unitPriceCents: 250,
          assignedTimeblockIds: [],
        },
      ],
    }))
    const deferredDelete = createDeferred<boolean>()
    deleteItemMock.mockReturnValue(deferredDelete.promise)

    const { result, queryClient } = renderHookWithProviders(() => useBeverageSection())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    act(() => {
      result.current.removeItem({ itemId: "bev-1" })
    })

    await waitFor(() => {
      const cached = queryClient.getQueryData<BeverageSectionPayload>(["beverageSection", "event-1"])
      expect(cached?.items.map((item) => item.id)).toEqual(["bev-2"])
    })

    deferredDelete.resolve(true)
  })

  it("optimistic assignment updates assignedTimeblockIds", async () => {
    const getSectionMock = vi.mocked(beverageItemsIpc.getBeverageSectionWithItems)
    const setAssignmentsMock = vi.mocked(beverageItemsIpc.setBeverageItemTimeblocks)

    getSectionMock.mockResolvedValue(makeSection())
    const deferredAssign = createDeferred<{ itemId: string; timeblockIds: string[] }>()
    setAssignmentsMock.mockReturnValue(deferredAssign.promise)

    const { result, queryClient } = renderHookWithProviders(() => useBeverageSection())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    act(() => {
      result.current.setItemTimeblocks({ itemId: "bev-1", timeblockIds: ["tb-1", "tb-2"] })
    })

    await waitFor(() => {
      const cached = queryClient.getQueryData<BeverageSectionPayload>(["beverageSection", "event-1"])
      expect(cached?.items[0]?.assignedTimeblockIds).toEqual(["tb-1", "tb-2"])
    })

    deferredAssign.resolve({ itemId: "bev-1", timeblockIds: ["tb-1", "tb-2"] })
  })

  it("rolls cache back to previous state when mutation fails", async () => {
    const getSectionMock = vi.mocked(beverageItemsIpc.getBeverageSectionWithItems)
    const createItemMock = vi.mocked(beverageItemsIpc.createBeverageItem)

    const initialData = makeSection()
    getSectionMock.mockResolvedValue(initialData)
    createItemMock.mockRejectedValue(new Error("create failed"))

    const { result, queryClient } = renderHookWithProviders(() => useBeverageSection())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    act(() => {
      result.current.addItem({
        type: "Beer",
        newItem: { name: "Latte" },
      })
    })

    await waitFor(() => {
      const cached = queryClient.getQueryData<BeverageSectionPayload>(["beverageSection", "event-1"])
      expect(cached).toEqual(initialData)
    })
  })
})
