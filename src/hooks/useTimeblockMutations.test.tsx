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

  it("invalidates the timeline query key after create settles", async () => {
    vi.mocked(timeblocksIpc.createTimeblock).mockResolvedValue(makeCreatedTimeblock())

    const { result, queryClient } = renderHookWithProviders(() =>
      useTimeblockMutations({
        queryKey: ["beverageSection", "event-1"],
        eventId: "event-1",
        sectionType: "beverage",
        cacheShape: "beverageSection",
      })
    )

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    act(() => {
      result.current.addTimeblock()
    })

    await waitFor(() => expect(timeblocksIpc.createTimeblock).toHaveBeenCalledTimes(1))

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["beverageSection", "event-1"] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["beverage", "event-1"] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["timeblocks", "event-1"] })
  })

  it("invalidates the timeline query key after delete settles", async () => {
    vi.mocked(timeblocksIpc.deleteTimeblock).mockResolvedValue(true)

    const { result, queryClient } = renderHookWithProviders(() =>
      useTimeblockMutations({
        queryKey: ["beverageSection", "event-1"],
        eventId: "event-1",
        sectionType: "beverage",
        cacheShape: "beverageSection",
      })
    )

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    act(() => {
      result.current.removeTimeblock("tb-1")
    })

    await waitFor(() => expect(timeblocksIpc.deleteTimeblock).toHaveBeenCalledWith("tb-1"))

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["beverageSection", "event-1"] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["beverage", "event-1"] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["timeblocks", "event-1"] })
  })

  it("invalidates the timeline after a title or time update", async () => {
    vi.mocked(timeblocksIpc.updateTimeblock).mockResolvedValue(
      makeCreatedTimeblock({ title: "Dinner", sectionType: "food" })
    )

    const { result, queryClient } = renderHookWithProviders(() =>
      useTimeblockMutations({
        queryKey: ["foodSection", "event-1"],
        eventId: "event-1",
        sectionType: "food",
      })
    )

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    act(() => {
      result.current.updateTimeblock({ id: "tb-1", updates: { title: "Dinner" } })
    })

    await waitFor(() => expect(timeblocksIpc.updateTimeblock).toHaveBeenCalledTimes(1))

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["foodSection", "event-1"] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["timeblocks", "event-1"] })
  })

  it("does not invalidate the timeline after an assignedTo-only update", async () => {
    vi.mocked(timeblocksIpc.updateTimeblock).mockResolvedValue(
      makeCreatedTimeblock({ assignedTo: "Alex", sectionType: "food" })
    )

    const { result, queryClient } = renderHookWithProviders(() =>
      useTimeblockMutations({
        queryKey: ["foodSection", "event-1"],
        eventId: "event-1",
        sectionType: "food",
      })
    )

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    act(() => {
      result.current.updateTimeblock({ id: "tb-1", updates: { assignedTo: "Alex" } })
    })

    await waitFor(() => expect(timeblocksIpc.updateTimeblock).toHaveBeenCalledTimes(1))

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["foodSection", "event-1"] })
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: ["timeblocks", "event-1"] })
  })
})
