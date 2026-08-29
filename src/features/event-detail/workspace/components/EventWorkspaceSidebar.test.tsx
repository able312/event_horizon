import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import EventWorkspaceSidebar from "./EventWorkspaceSidebar"

const baseProps = {
  eventType: "function" as string | undefined,
  selectedNodeId: null as string | null,
  selectedTimeblockId: null as string | null,
  selectedCategoryId: null as "food" | "overview" | null,
  onSelectNode: vi.fn(),
  onSelectCategory: vi.fn(),
  searchQuery: "",
}

describe("EventWorkspaceSidebar", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("selects scheduled and unscheduled nodes from the scroll region", () => {
    const onSelectNode = vi.fn()

    render(
      <EventWorkspaceSidebar
        {...baseProps}
        onSelectNode={onSelectNode}
        navModel={{
          scheduled: [
            {
              id: "scheduled:a",
              groupId: "scheduled",
              nodeType: "timeblock",
              label: "Start",
              time: "09:00",
              subLabel: "Note",
              assignedTo: "Alex",
              sourceRef: { kind: "timeblock", timeblockId: "a" },
            },
          ],
          unscheduled: [
            {
              id: "unscheduled:b",
              groupId: "unscheduled",
              nodeType: "timeblock",
              label: "Prep",
              subLabel: "Setup Instruction",
              sourceRef: { kind: "timeblock", timeblockId: "b" },
            },
          ],
          categories: [
            {
              id: "category:food",
              groupId: "categories",
              nodeType: "category",
              label: "Food",
              sourceRef: { kind: "category", categoryId: "food" },
            },
          ],
        }}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: /Start/i }))
    fireEvent.click(screen.getByRole("button", { name: /Prep/i }))

    expect(onSelectNode).toHaveBeenNthCalledWith(1, "scheduled:a")
    expect(onSelectNode).toHaveBeenNthCalledWith(2, "unscheduled:b")
    expect(screen.getByText("Alex")).toBeTruthy()
  })

  it("renders timeline groups in the scroll region and icon menu in the bottom region", () => {
    const onSelectCategory = vi.fn()

    render(
      <EventWorkspaceSidebar
        {...baseProps}
        eventType="tournament"
        onSelectCategory={onSelectCategory}
        selectedCategoryId="food"
        navModel={{
          scheduled: [
            {
              id: "scheduled:a",
              groupId: "scheduled",
              nodeType: "timeblock",
              label: "Start",
              time: "09:00",
              sourceRef: { kind: "timeblock", timeblockId: "a" },
            },
          ],
          unscheduled: [
            {
              id: "unscheduled:b",
              groupId: "unscheduled",
              nodeType: "timeblock",
              label: "Prep",
              sourceRef: { kind: "timeblock", timeblockId: "b" },
            },
          ],
          categories: [],
        }}
      />,
    )

    const scrollRegion = screen.getByTestId("event-workspace-sidebar-scroll-region")
    const bottomRegion = screen.getByTestId("event-workspace-sidebar-bottom-region")

    expect(within(scrollRegion).getByText("Scheduled Timeline")).toBeTruthy()
    expect(within(scrollRegion).getByText("Unscheduled Queue")).toBeTruthy()
    expect(within(bottomRegion).getByTestId("workspace-category-icon-menu")).toBeTruthy()
    expect(within(bottomRegion).getByRole("button", { name: "Food" })).toBeTruthy()
    expect(within(bottomRegion).getByRole("button", { name: "Tournament" })).toBeTruthy()

    fireEvent.click(within(bottomRegion).getByRole("button", { name: "Food" }))
    expect(onSelectCategory).toHaveBeenCalledWith("food")
  })

  it("shows empty states and omits tournament icon for non-tournament events", () => {
    render(
      <EventWorkspaceSidebar
        {...baseProps}
        eventType="wedding"
        searchQuery="zzz"
        navModel={{
          scheduled: [],
          unscheduled: [],
          categories: [],
        }}
      />,
    )

    const scrollRegion = screen.getByTestId("event-workspace-sidebar-scroll-region")
    const bottomRegion = screen.getByTestId("event-workspace-sidebar-bottom-region")

    expect(within(scrollRegion).getByText("No scheduled matches")).toBeTruthy()
    expect(within(scrollRegion).getByText("No unscheduled matches")).toBeTruthy()
    expect(within(bottomRegion).queryByRole("button", { name: "Tournament" })).toBeNull()
    expect(within(bottomRegion).getByRole("button", { name: "Overview" })).toBeTruthy()
  })

  it("marks the selected note with aria-current via timeblock id", () => {
    render(
      <EventWorkspaceSidebar
        {...baseProps}
        selectedNodeId="scheduled:a"
        selectedTimeblockId="a"
        navModel={{
          scheduled: [
            {
              id: "scheduled:a",
              groupId: "scheduled",
              nodeType: "timeblock",
              label: "Start",
              time: "09:00",
              sourceRef: { kind: "timeblock", timeblockId: "a" },
            },
          ],
          unscheduled: [],
          categories: [],
        }}
      />,
    )

    expect(screen.getByRole("button", { name: /Start/i }).getAttribute("aria-current")).toBe("true")
  })
})
