import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { useEventWorkspaceData } from "./useEventWorkspaceData"

const useEventMock = vi.fn()
const useTimelineMock = vi.fn()
const useFoodSectionMock = vi.fn()
const useBeverageSectionMock = vi.fn()
const useVendorSectionMock = vi.fn()
const useNoteSectionMock = vi.fn()
const useSetupInstructionSectionMock = vi.fn()

vi.mock("~/hooks/useEvent", () => ({ useEvent: () => useEventMock() }))
vi.mock("~/hooks/useTimeline", () => ({ useTimeline: () => useTimelineMock() }))
vi.mock("~/hooks/useFoodSection", () => ({ useFoodSection: () => useFoodSectionMock() }))
vi.mock("~/hooks/useBeverageSection", () => ({ useBeverageSection: () => useBeverageSectionMock() }))
vi.mock("~/hooks/useVendorSection", () => ({ useVendorSection: () => useVendorSectionMock() }))
vi.mock("~/hooks/useNoteSection", () => ({ useNoteSection: () => useNoteSectionMock() }))
vi.mock("~/hooks/useSetupInstrucionSection", () => ({ useSetupInstructionSection: () => useSetupInstructionSectionMock() }))

describe("useEventWorkspaceData", () => {
  it("aggregates source hooks into nav model and exposes refetchAll", async () => {
    const updateEvent = vi.fn(async () => ({ id: "event-1" } as never))
    const deleteEvent = vi.fn(async () => true)

    useEventMock.mockReturnValue({
      data: { id: "event-1", title: "Event" },
      isLoading: false,
      isFetching: false,
      error: null,
      updateEvent,
      deleteEvent,
      refetch: vi.fn(async () => undefined),
    })
    useTimelineMock.mockReturnValue({
      data: [{ id: "scheduled-1", title: "Scheduled", time: "09:00", sectionType: "note", timelineMeta: { source: "timeblock", isSystem: false, isEditable: true } }],
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(async () => undefined),
    })

    const common = {
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(async () => undefined),
    }

    useFoodSectionMock.mockReturnValue({ data: [{ id: "u-food", title: "Food prep", time: "", sectionType: "food" }], ...common })
    useBeverageSectionMock.mockReturnValue({ data: [], ...common })
    useVendorSectionMock.mockReturnValue({ data: [], ...common })
    useNoteSectionMock.mockReturnValue({ data: [], ...common })
    useSetupInstructionSectionMock.mockReturnValue({ data: [], ...common })

    const { result } = renderHook(() => useEventWorkspaceData())

    expect(result.current.navModel.scheduled).toHaveLength(1)
    expect(result.current.navModel.unscheduled).toHaveLength(1)
    expect(result.current.updateEvent).toBe(updateEvent)
    expect(result.current.deleteEvent).toBe(deleteEvent)

    await result.current.refetchAll()
    expect(useEventMock.mock.results[0].value.refetch).toHaveBeenCalledTimes(1)
  })
})
