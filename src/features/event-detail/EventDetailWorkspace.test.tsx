import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import EventDetailWorkspace from "./EventDetailWorkspace"

const useEventWorkspaceDataMock = vi.fn()
const useWorkspaceSelectionMock = vi.fn()
const panelPropsMock = vi.fn()
const bodyPropsMock = vi.fn()

vi.mock("./workspace/hooks/useEventWorkspaceData", () => ({
  useEventWorkspaceData: () => useEventWorkspaceDataMock(),
}))

vi.mock("./workspace/hooks/useWorkspaceSelection", () => ({
  useWorkspaceSelection: () => useWorkspaceSelectionMock(),
}))

vi.mock("./panels/EventDetailPanelOrchestrator", () => ({
  default: (props: unknown) => {
    panelPropsMock(props)
    return (
      <button
        type="button"
        onClick={() => (props as { onSelectNode: (id: string) => void }).onSelectNode("category:food")}
      >
        pick-node
      </button>
    )
  },
}))

vi.mock("./pages/EventDetailBodyOrchestrator", () => ({
  default: (props: unknown) => {
    bodyPropsMock(props)
    return <div data-testid="event-detail-body" />
  },
}))

describe("EventDetailWorkspace", () => {
  it("passes nav + selection into panel/body and wires eventResource", () => {
    const updateEvent = vi.fn(async () => ({ id: "1" } as never))
    const deleteEvent = vi.fn(async () => true)
    const setSelectedNodeId = vi.fn()
    const selectCategory = vi.fn()
    const navigateToNote = vi.fn()
    const navigateToOverview = vi.fn()

    useEventWorkspaceDataMock.mockReturnValue({
      event: { id: "1", title: "Alpha", type: "wedding" },
      isLoading: false,
      isFetching: false,
      error: null,
      updateEvent,
      deleteEvent,
      timelineRows: [],
      sectionRows: [],
      navModel: { scheduled: [], unscheduled: [], categories: [] },
      refetchAll: vi.fn(async () => undefined),
    })

    useWorkspaceSelectionMock.mockReturnValue({
      selectedNodeId: "scheduled:a",
      selectedNode: null,
      selectedTimeblockId: null,
      selectedCategoryId: "overview",
      setSelectedNodeId,
      selectCategory,
      navigateToNote,
      navigateToOverview,
    })

    render(<EventDetailWorkspace />)

    fireEvent.click(screen.getByRole("button", { name: "pick-node" }))

    expect(panelPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "wedding",
        selectedCategoryId: "overview",
        onSelectCategory: selectCategory,
        onNavigateToNote: navigateToNote,
        onNavigateToOverview: navigateToOverview,
      }),
    )
    expect(setSelectedNodeId).toHaveBeenCalledWith("category:food")
    expect(bodyPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventResource: expect.objectContaining({
          event: expect.objectContaining({ id: "1" }),
          updateEvent,
          deleteEvent,
        }),
        onSelectNode: setSelectedNodeId,
        onNavigateToOverview: navigateToOverview,
      }),
    )
  })

  it("shows route blocking error when workspace data fails and retries", () => {
    const refetchAll = vi.fn(async () => undefined)

    useEventWorkspaceDataMock.mockReturnValue({
      event: undefined,
      isLoading: false,
      isFetching: false,
      error: new Error("load failed"),
      updateEvent: vi.fn(async () => ({ id: "1" } as never)),
      deleteEvent: vi.fn(async () => true),
      timelineRows: [],
      sectionRows: [],
      navModel: { scheduled: [], unscheduled: [], categories: [] },
      refetchAll,
    })

    useWorkspaceSelectionMock.mockReturnValue({
      selectedNodeId: null,
      selectedNode: null,
      selectedTimeblockId: null,
      selectedCategoryId: null,
      setSelectedNodeId: vi.fn(),
      selectCategory: vi.fn(),
      navigateToNote: vi.fn(),
      navigateToOverview: vi.fn(),
    })

    render(<EventDetailWorkspace />)

    expect(screen.getByText("Could not load event workspace")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Retry" }))
    expect(refetchAll).toHaveBeenCalledTimes(1)
  })
})
