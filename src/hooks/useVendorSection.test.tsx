import { act, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import * as vendorItemsIpc from "~/lib/ipc/vendorItems"
import { renderHookWithProviders } from "~/test/renderHookWithProviders"
import { useVendorSection } from "./useVendorSection"

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

vi.mock("~/lib/ipc/vendorItems", () => ({
  getVendorsByEvent: vi.fn(),
  createVendor: vi.fn(),
  updateVendor: vi.fn(),
  deleteVendor: vi.fn(),
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

function makeVendorTimeblock(overrides: Partial<TimeblockWithItems> = {}): TimeblockWithItems {
  return {
    id: "tb-vendor-1",
    eventId: "event-1",
    title: "Vendor",
    time: null,
    sectionType: "vendor",
    assignedTo: null,
    createdAt: "created",
    updatedAt: null,
    vendorItem: {
      id: "vendor-1",
      timeblockId: "tb-vendor-1",
      contactName: "Old Name",
      contactPhone: "111",
      contactEmail: "old@example.com",
      notes: "Old note",
    },
    ...overrides,
  }
}

afterEach(() => {
  vi.clearAllMocks()
})

describe("useVendorSection optimistic cache", () => {
  it("optimistic add uses nested vendorItem shape and replaces temp row on success", async () => {
    const getVendorsMock = vi.mocked(vendorItemsIpc.getVendorsByEvent)
    const createVendorMock = vi.mocked(vendorItemsIpc.createVendor)

    const serverResponse = {
      timeblock: {
        id: "tb-vendor-created",
        eventId: "event-1",
        title: "",
        time: "",
        sectionType: "vendor" as const,
        assignedTo: null,
        createdAt: "created",
        updatedAt: null,
      },
      vendor: {
        id: "vendor-created",
        timeblockId: "tb-vendor-created",
        contactName: "",
        contactPhone: "",
        contactEmail: "",
        notes: null,
      },
    }

    getVendorsMock
      .mockResolvedValueOnce([])
      .mockResolvedValue([{
        ...serverResponse.timeblock,
        vendorItem: serverResponse.vendor,
      }])

    const deferredCreate = createDeferred<ReturnType<typeof vendorItemsIpc.createVendor> extends Promise<infer R> ? R : never>()
    createVendorMock.mockReturnValue(deferredCreate.promise)

    const { result, queryClient } = renderHookWithProviders(() => useVendorSection())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    act(() => {
      result.current.addVendor()
    })

    await waitFor(() => {
      const cached = queryClient.getQueryData<TimeblockWithItems[]>(["vendorSection", "event-1"])
      expect(cached?.[0].sectionType).toBe("vendor")
      expect(cached?.[0].time).toBe("")
      expect(cached?.[0].vendorItem?.id.startsWith("temp_")).toBe(true)
    })

    await act(async () => {
      deferredCreate.resolve(serverResponse)
      await deferredCreate.promise
    })

    await waitFor(() => {
      const cached = queryClient.getQueryData<TimeblockWithItems[]>(["vendorSection", "event-1"])
      expect(cached?.[0].id).toBe("tb-vendor-created")
      expect(cached?.[0].vendorItem?.id).toBe("vendor-created")
      expect(cached?.[0].time).toBe("")
    })
  })

  it("optimistic update modifies nested vendorItem fields", async () => {
    const getVendorsMock = vi.mocked(vendorItemsIpc.getVendorsByEvent)
    const updateVendorMock = vi.mocked(vendorItemsIpc.updateVendor)

    getVendorsMock.mockResolvedValue([makeVendorTimeblock()])
    const deferredUpdate = createDeferred<ReturnType<typeof vendorItemsIpc.updateVendor> extends Promise<infer R> ? R : never>()
    updateVendorMock.mockReturnValue(deferredUpdate.promise)

    const { result, queryClient } = renderHookWithProviders(() => useVendorSection())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    act(() => {
      result.current.updateVendor({
        id: "vendor-1",
        updates: {
          contactName: "New Name",
          contactPhone: "222",
          contactEmail: "new@example.com",
          notes: "New note",
        },
      })
    })

    await waitFor(() => {
      const cached = queryClient.getQueryData<TimeblockWithItems[]>(["vendorSection", "event-1"])
      const vendorItem = cached?.[0].vendorItem
      expect(vendorItem?.contactName).toBe("New Name")
      expect(vendorItem?.contactPhone).toBe("222")
      expect(vendorItem?.contactEmail).toBe("new@example.com")
      expect(vendorItem?.notes).toBe("New note")
    })

    deferredUpdate.resolve({
      id: "vendor-1",
      timeblockId: "tb-vendor-1",
      contactName: "New Name",
      contactPhone: "222",
      contactEmail: "new@example.com",
      notes: "New note",
    })
  })

  it("rolls cache back when vendor mutation fails", async () => {
    const getVendorsMock = vi.mocked(vendorItemsIpc.getVendorsByEvent)
    const updateVendorMock = vi.mocked(vendorItemsIpc.updateVendor)

    const initialData = [makeVendorTimeblock()]
    getVendorsMock.mockResolvedValue(initialData)
    updateVendorMock.mockRejectedValue(new Error("vendor update failed"))

    const { result, queryClient } = renderHookWithProviders(() => useVendorSection())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    act(() => {
      result.current.updateVendor({
        id: "vendor-1",
        updates: { contactName: "Broken" },
      })
    })

    await waitFor(() => {
      const cached = queryClient.getQueryData<TimeblockWithItems[]>(["vendorSection", "event-1"])
      expect(cached).toEqual(initialData)
    })
  })
})
