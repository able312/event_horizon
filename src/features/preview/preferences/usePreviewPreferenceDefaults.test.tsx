import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { PreviewPreferencesProvider, usePreviewPreferences } from "./PreviewPreferencesContext"
import { usePreviewPreferenceDefaults } from "./usePreviewPreferenceDefaults"

const mocks = vi.hoisted(() => ({
  event: vi.fn(), food: vi.fn(), beverage: vi.fn(), setup: vi.fn(), notes: vi.fn(), payments: vi.fn(),
}))
vi.mock("~/hooks/useEvent", () => ({ useEvent: mocks.event }))
vi.mock("~/hooks/useFoodSection", () => ({ useFoodSection: mocks.food }))
vi.mock("~/hooks/useBeverageSection", () => ({ useBeverageSection: mocks.beverage }))
vi.mock("~/hooks/useSetupInstrucionSection", () => ({ useSetupInstructionSection: mocks.setup }))
vi.mock("~/hooks/useNoteSection", () => ({ useNoteSection: mocks.notes }))
vi.mock("~/hooks/usePaymentsSection", () => ({ usePaymentsSection: mocks.payments }))

describe("usePreviewPreferenceDefaults", () => {
  it("waits for every BEO section and preserves later user selections", () => {
    mocks.event.mockReturnValue({ data: { id: "event" } })
    mocks.food.mockReturnValue({ data: undefined })
    mocks.beverage.mockReturnValue({ data: undefined, timeblocks: [] })
    mocks.setup.mockReturnValue({ data: undefined })
    mocks.notes.mockReturnValue({ data: undefined })
    mocks.payments.mockReturnValue({ data: undefined })
    const { result, rerender } = renderHook(() => {
      usePreviewPreferenceDefaults()
      return usePreviewPreferences()
    }, { wrapper: PreviewPreferencesProvider })
    expect(result.current.state.defaultsApplied.beoTimeblocks).toBe(false)

    mocks.food.mockReturnValue({ data: [{ id: "food" }] })
    mocks.beverage.mockReturnValue({ data: { timeblocks: [{ id: "bar" }] }, timeblocks: [{ id: "bar" }] })
    mocks.setup.mockReturnValue({ data: [] })
    rerender()
    expect(result.current.state.defaultsApplied.beoTimeblocks).toBe(false)

    mocks.notes.mockReturnValue({ data: [{ id: "note" }] })
    rerender()
    expect(result.current.state.beo.selectedTimeblockIds).toEqual({
      food: ["food"], beverage: ["bar"], setup: [], notes: ["note"],
    })
    act(() => result.current.dispatch({ type: "beo/clearAllTimeblocks", section: "food" }))
    mocks.food.mockReturnValue({ data: [{ id: "food" }, { id: "new-food" }] })
    rerender()
    expect(result.current.state.beo.selectedTimeblockIds.food).toEqual([])
  })
})
