import { act, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import * as timeblocksIpc from "~/lib/ipc/timeblocks"
import { renderHookWithProviders } from "~/test/renderHookWithProviders"
import { useSetupInstructionSection } from "./useSetupInstrucionSection"

const addTimeblock = vi.fn()
const updateTimeblock = vi.fn()
const removeTimeblock = vi.fn()

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router")
  return {
    ...actual,
    useParams: () => ({ id: "event-1" }),
  }
})

vi.mock("./useTimeblockMutations", () => ({
  useTimeblockMutations: () => ({
    addTimeblock,
    updateTimeblock,
    removeTimeblock,
  }),
}))

vi.mock("~/lib/ipc/timeblocks", () => ({
  getTimeblocksByEventAndSection: vi.fn(),
}))

function makeSetupTimeblock(overrides: Partial<Awaited<ReturnType<typeof timeblocksIpc.getTimeblocksByEventAndSection>>[number]> = {}) {
  return {
    id: "tb-setup-1",
    eventId: "event-1",
    title: "Setup",
    time: null,
    details: "Original setup text",
    sectionType: "setup_instruction",
    assignedTo: null,
    createdAt: "created",
    updatedAt: null,
    ...overrides,
  }
}

afterEach(() => {
  vi.clearAllMocks()
})

describe("useSetupInstructionSection", () => {
  it("loads setup instruction timeblocks from the shared timeblocks IPC query", async () => {
    const getTimeblocksMock = vi.mocked(timeblocksIpc.getTimeblocksByEventAndSection)
    getTimeblocksMock.mockResolvedValue([makeSetupTimeblock()])

    const { result, queryClient } = renderHookWithProviders(() => useSetupInstructionSection())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(getTimeblocksMock).toHaveBeenCalledWith("event-1", "setup_instruction")
    expect(queryClient.getQueryData(["setupInstructions", "event-1"])).toEqual([makeSetupTimeblock()])
  })

  it("returns shared timeblock mutation handlers", async () => {
    vi.mocked(timeblocksIpc.getTimeblocksByEventAndSection).mockResolvedValue([])

    const { result } = renderHookWithProviders(() => useSetupInstructionSection())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.updateTimeblock).toBe(updateTimeblock)
    expect(result.current.removeTimeblock).toBe(removeTimeblock)
  })

  it("forwards setup prefill requests through the shared mutation hook", async () => {
    vi.mocked(timeblocksIpc.getTimeblocksByEventAndSection).mockResolvedValue([])

    const { result } = renderHookWithProviders(() => useSetupInstructionSection())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    act(() => {
      result.current.addSetupInstruction({ prefill: "default" })
    })

    expect(addTimeblock).toHaveBeenCalledWith({
      prefill: {
        mode: "section_default",
        sectionType: "setup_instruction",
        overrides: {
          title: undefined,
          details: undefined,
        },
      },
    })
  })
})
