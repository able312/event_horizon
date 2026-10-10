import { act, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import * as timeblocksIpc from "~/lib/data/timeblocks"
import type { Timeblock } from "~/definitions/database"
import { renderHookWithProviders } from "~/test/renderHookWithProviders"
import { useTimeblockMutations } from "./useTimeblockMutations"

vi.mock("~/lib/data/timeblocks", () => ({
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

  it("replaces optimistic temp ids with the real created timeblock id", async () => {
    vi.mocked(timeblocksIpc.createTimeblock).mockResolvedValue(
      makeCreatedTimeblock({ id: "tb-real-1", title: "New Note", sectionType: "note" }),
    )

    const { result, queryClient } = renderHookWithProviders(() =>
      useTimeblockMutations({
        queryKey: ["note", "event-1"],
        eventId: "event-1",
        sectionType: "note",
      }),
    )

    queryClient.setQueryData(["note", "event-1"], [])

    let createdId = ""
    await act(async () => {
      const created = await result.current.addTimeblockAsync({ title: "New Note", details: "" })
      createdId = created.id
    })

    expect(createdId).toBe("tb-real-1")
    const cached = queryClient.getQueryData<Array<{ id: string }>>(["note", "event-1"])
    expect(cached?.some((row) => row.id === "tb-real-1")).toBe(true)
    expect(cached?.some((row) => row.id.startsWith("temp_"))).toBe(false)
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

  it("leaves refreshing to live queries after create, update and delete", async () => {
    vi.mocked(timeblocksIpc.createTimeblock).mockResolvedValue(makeCreatedTimeblock({ id: "tb-2", sectionType: "food" }))
    vi.mocked(timeblocksIpc.updateTimeblock).mockResolvedValue(makeCreatedTimeblock({ id: "tb-1", title: "Dinner", sectionType: "food" }))
    vi.mocked(timeblocksIpc.deleteTimeblock).mockResolvedValue(true)

    const { result, queryClient } = renderHookWithProviders(() =>
      useTimeblockMutations({
        queryKey: ["foodSection", "event-1"],
        eventId: "event-1",
        sectionType: "food",
      })
    )
    queryClient.setQueryData(["foodSection", "event-1"], [makeCreatedTimeblock({ id: "tb-1", sectionType: "food" })])
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
    const refetchSpy = vi.spyOn(queryClient, "refetchQueries")

    await act(async () => {
      await result.current.addTimeblockAsync()
      await result.current.updateTimeblockAsync({ id: "tb-1", updates: { title: "Dinner" } })
      await result.current.removeTimeblockAsync("tb-2")
    })

    expect(queryClient.getQueryData(["foodSection", "event-1"])).toEqual([
      expect.objectContaining({ id: "tb-1", title: "Dinner" }),
    ])
    expect(invalidateSpy).not.toHaveBeenCalled()
    expect(refetchSpy).not.toHaveBeenCalled()
  })
})
