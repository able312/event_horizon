import { act, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import * as setupInstructionsIpc from "~/lib/ipc/setupInstructions"
import { renderHookWithProviders } from "~/test/renderHookWithProviders"
import { useSetupInstructionSection } from "./useSetupInstrucionSection"

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

vi.mock("~/lib/ipc/setupInstructions", () => ({
  getSetupInstructionsByEvent: vi.fn(),
  createSetupInstruction: vi.fn(),
  updateSetupInstruction: vi.fn(),
  deleteSetupInstruction: vi.fn(),
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

function makeSetupTimeblock(overrides: Partial<TimeblockWithItems> = {}): TimeblockWithItems {
  return {
    id: "tb-setup-1",
    eventId: "event-1",
    title: "Setup",
    time: null,
    sectionType: "setup_instruction",
    assignedTo: null,
    createdAt: "created",
    updatedAt: null,
    setupInstruction: {
      id: "setup-1",
      timeblockId: "tb-setup-1",
      instruction: "Original setup text",
      createdAt: "created",
      updatedAt: null,
    },
    ...overrides,
  }
}

afterEach(() => {
  vi.clearAllMocks()
})

describe("useSetupInstructionSection optimistic cache", () => {
  it("optimistic update changes nested setupInstruction.instruction", async () => {
    const getSetupMock = vi.mocked(setupInstructionsIpc.getSetupInstructionsByEvent)
    const updateSetupMock = vi.mocked(setupInstructionsIpc.updateSetupInstruction)

    getSetupMock.mockResolvedValue([makeSetupTimeblock()])
    const deferredUpdate = createDeferred<ReturnType<typeof setupInstructionsIpc.updateSetupInstruction> extends Promise<infer R> ? R : never>()
    updateSetupMock.mockReturnValue(deferredUpdate.promise)

    const { result, queryClient } = renderHookWithProviders(() => useSetupInstructionSection())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    act(() => {
      result.current.updateSetupInstruction({
        id: "setup-1",
        updates: { instruction: "Updated setup text" },
      })
    })

    await waitFor(() => {
      const cached = queryClient.getQueryData<TimeblockWithItems[]>(["setupInstructions", "event-1"])
      expect(cached?.[0].setupInstruction?.instruction).toBe("Updated setup text")
    })

    deferredUpdate.resolve({
      id: "setup-1",
      timeblockId: "tb-setup-1",
      instruction: "Updated setup text",
      createdAt: "created",
      updatedAt: null,
    })
  })

  it("optimistic add uses nested setupInstruction shape and replaces temp row on success", async () => {
    const getSetupMock = vi.mocked(setupInstructionsIpc.getSetupInstructionsByEvent)
    const createSetupMock = vi.mocked(setupInstructionsIpc.createSetupInstruction)

    const serverResponse = {
      timeblock: {
        id: "tb-setup-created",
        eventId: "event-1",
        title: "",
        time: "",
        sectionType: "setup_instruction" as const,
        assignedTo: null,
        createdAt: "created",
        updatedAt: null,
      },
      setupInstruction: {
        id: "setup-created",
        timeblockId: "tb-setup-created",
        instruction: "",
        createdAt: "created",
        updatedAt: "created",
      },
    }

    getSetupMock
      .mockResolvedValueOnce([])
      .mockResolvedValue([{
        ...serverResponse.timeblock,
        setupInstruction: serverResponse.setupInstruction,
      }])
    const deferredCreate = createDeferred<ReturnType<typeof setupInstructionsIpc.createSetupInstruction> extends Promise<infer R> ? R : never>()
    createSetupMock.mockReturnValue(deferredCreate.promise)

    const { result, queryClient } = renderHookWithProviders(() => useSetupInstructionSection())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    act(() => {
      result.current.addSetupInstruction()
    })

    await waitFor(() => {
      const cached = queryClient.getQueryData<TimeblockWithItems[]>(["setupInstructions", "event-1"])
      expect(cached?.[0].eventId).toBe("event-1")
      expect(cached?.[0].sectionType).toBe("setup_instruction")
      expect(cached?.[0].time).toBe("")
      expect(cached?.[0].setupInstruction?.id.startsWith("temp_")).toBe(true)
    })

    await act(async () => {
      deferredCreate.resolve(serverResponse)
      await deferredCreate.promise
    })

    await waitFor(() => {
      const cached = queryClient.getQueryData<TimeblockWithItems[]>(["setupInstructions", "event-1"])
      expect(cached?.[0].id).toBe("tb-setup-created")
      expect(cached?.[0].setupInstruction?.id).toBe("setup-created")
      expect(cached?.[0].time).toBe("")
    })
  })

  it("rolls cache back when setup instruction mutation fails", async () => {
    const getSetupMock = vi.mocked(setupInstructionsIpc.getSetupInstructionsByEvent)
    const updateSetupMock = vi.mocked(setupInstructionsIpc.updateSetupInstruction)

    const initialData = [makeSetupTimeblock()]
    getSetupMock.mockResolvedValue(initialData)
    updateSetupMock.mockRejectedValue(new Error("setup update failed"))

    const { result, queryClient } = renderHookWithProviders(() => useSetupInstructionSection())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    act(() => {
      result.current.updateSetupInstruction({
        id: "setup-1",
        updates: { instruction: "Broken update" },
      })
    })

    await waitFor(() => {
      const cached = queryClient.getQueryData<TimeblockWithItems[]>(["setupInstructions", "event-1"])
      expect(cached).toEqual(initialData)
    })
  })
})
