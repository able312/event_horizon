import { act, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import * as timeblocksIpc from "~/lib/ipc/timeblocks"
import type { Timeblock } from "~/definitions/database"
import { renderHookWithProviders } from "~/test/renderHookWithProviders"
import { useTimeblockMutations } from "./useTimeblockMutations"

vi.mock("~/lib/ipc/timeblocks", () => ({
  createTimeblock: vi.fn(),
  updateTimeblock: vi.fn(),
  deleteTimeblock: vi.fn(),
}))

function makeCreatedTimeblock(overrides: Partial<Timeblock> = {}): Timeblock {
  return {
    id: "tb-created-1",
    eventId: "event-1",
    title: "",
    time: "",
    details: "",
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

describe("useTimeblockMutations", () => {
  it("creates blank setup instructions with the existing payload", async () => {
    vi.mocked(timeblocksIpc.createTimeblock).mockResolvedValue(makeCreatedTimeblock())

    const { result } = renderHookWithProviders(() =>
      useTimeblockMutations({
        queryKey: ["setupInstructions", "event-1"],
        eventId: "event-1",
        sectionType: "setup_instruction",
      })
    )

    act(() => {
      result.current.addTimeblock()
    })

    await waitFor(() =>
      expect(timeblocksIpc.createTimeblock).toHaveBeenCalledWith({
        eventId: "event-1",
        sectionType: "setup_instruction",
      })
    )
  })

  it("passes explicit title and details through on create", async () => {
    vi.mocked(timeblocksIpc.createTimeblock).mockResolvedValue(
      makeCreatedTimeblock({ title: "Room Flip", details: "Move chairs" })
    )

    const { result } = renderHookWithProviders(() =>
      useTimeblockMutations({
        queryKey: ["setupInstructions", "event-1"],
        eventId: "event-1",
        sectionType: "setup_instruction",
      })
    )

    act(() => {
      result.current.addTimeblock({ title: "Room Flip", details: "Move chairs" })
    })

    await waitFor(() =>
      expect(timeblocksIpc.createTimeblock).toHaveBeenCalledWith({
        eventId: "event-1",
        sectionType: "setup_instruction",
        title: "Room Flip",
        details: "Move chairs",
      })
    )
  })

  it("passes section-default prefill requests through on create", async () => {
    vi.mocked(timeblocksIpc.createTimeblock).mockResolvedValue(
      makeCreatedTimeblock({ title: "Setup", details: "Describe what needs to be done..." })
    )

    const { result } = renderHookWithProviders(() =>
      useTimeblockMutations({
        queryKey: ["setupInstructions", "event-1"],
        eventId: "event-1",
        sectionType: "setup_instruction",
      })
    )

    act(() => {
      result.current.addTimeblock({
        prefill: {
          mode: "section_default",
          sectionType: "setup_instruction",
        },
      })
    })

    await waitFor(() =>
      expect(timeblocksIpc.createTimeblock).toHaveBeenCalledWith({
        eventId: "event-1",
        sectionType: "setup_instruction",
        prefill: {
          mode: "section_default",
          sectionType: "setup_instruction",
        },
      })
    )
  })

  it("uses prefilled optimistic title and details for setup defaults", async () => {
    let resolveCreate: ((value: Timeblock) => void) | null = null
    vi.mocked(timeblocksIpc.createTimeblock).mockImplementation(
      () =>
        new Promise<Timeblock>((resolve) => {
          resolveCreate = resolve
        })
    )

    const { result, queryClient } = renderHookWithProviders(() =>
      useTimeblockMutations({
        queryKey: ["setupInstructions", "event-1"],
        eventId: "event-1",
        sectionType: "setup_instruction",
      })
    )

    act(() => {
      result.current.addTimeblock({
        prefill: {
          mode: "section_default",
          sectionType: "setup_instruction",
        },
      })
    })

    await waitFor(() => {
      const data = queryClient.getQueryData<Array<{ title: string; details: string | null }>>([
        "setupInstructions",
        "event-1",
      ])
      expect(data).toEqual([
        expect.objectContaining({
          title: "Setup",
          details: "Describe what needs to be done...",
        }),
      ])
    })

    act(() => {
      resolveCreate?.(makeCreatedTimeblock({ title: "Setup", details: "Describe what needs to be done..." }))
    })

    await waitFor(() => expect(timeblocksIpc.createTimeblock).toHaveBeenCalledTimes(1))
  })
})
