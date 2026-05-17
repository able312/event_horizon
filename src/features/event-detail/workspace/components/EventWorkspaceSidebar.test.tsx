import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import EventWorkspaceSidebar from "./EventWorkspaceSidebar"

describe("EventWorkspaceSidebar", () => {
  afterEach(() => {
    cleanup()
  })

  it("selects scheduled, unscheduled and category nodes", () => {
    const onSelectNode = vi.fn()

    render(
      <EventWorkspaceSidebar
        selectedNodeId={null}
        onSelectNode={onSelectNode}
        navModel={{
          scheduled: [{ id: "scheduled:a", groupId: "scheduled", nodeType: "timeblock", label: "Start", time: "09:00", sourceRef: { kind: "timeblock", timeblockId: "a" } }],
          unscheduled: [{ id: "unscheduled:b", groupId: "unscheduled", nodeType: "timeblock", label: "Prep", sourceRef: { kind: "timeblock", timeblockId: "b" } }],
          categories: [{ id: "category:food", groupId: "categories", nodeType: "category", label: "Food", sourceRef: { kind: "category", categoryId: "food" } }],
        }}
      />, 
    )

    fireEvent.click(screen.getByRole("button", { name: /Start/i }))
    fireEvent.click(screen.getByRole("button", { name: /Prep/i }))
    fireEvent.click(screen.getByRole("button", { name: /Food/i }))

    expect(onSelectNode).toHaveBeenNthCalledWith(1, "scheduled:a")
    expect(onSelectNode).toHaveBeenNthCalledWith(2, "unscheduled:b")
    expect(onSelectNode).toHaveBeenNthCalledWith(3, "category:food")
  })

  it("renders scheduled and unscheduled groups in the scroll region and categories in the bottom region", () => {
    render(
      <EventWorkspaceSidebar
        selectedNodeId={null}
        onSelectNode={vi.fn()}
        navModel={{
          scheduled: [{ id: "scheduled:a", groupId: "scheduled", nodeType: "timeblock", label: "Start", time: "09:00", sourceRef: { kind: "timeblock", timeblockId: "a" } }],
          unscheduled: [{ id: "unscheduled:b", groupId: "unscheduled", nodeType: "timeblock", label: "Prep", sourceRef: { kind: "timeblock", timeblockId: "b" } }],
          categories: [{ id: "category:food", groupId: "categories", nodeType: "category", label: "Food", sourceRef: { kind: "category", categoryId: "food" } }],
        }}
      />,
    )

    const scrollRegion = screen.getByTestId("event-workspace-sidebar-scroll-region")
    const bottomRegion = screen.getByTestId("event-workspace-sidebar-bottom-region")

    expect(within(scrollRegion).getByText("Scheduled Timeline")).toBeTruthy()
    expect(within(scrollRegion).getByText("Unscheduled Queue")).toBeTruthy()
    expect(within(bottomRegion).getByText("Categories")).toBeTruthy()

    expect(within(scrollRegion).getByRole("button", { name: /Start/i })).toBeTruthy()
    expect(within(scrollRegion).getByRole("button", { name: /Prep/i })).toBeTruthy()
    expect(within(bottomRegion).getByRole("button", { name: /Food/i })).toBeTruthy()
  })

  it("keeps the bottom region present and shows empty states in the correct sections", () => {
    render(
      <EventWorkspaceSidebar
        selectedNodeId={null}
        onSelectNode={vi.fn()}
        navModel={{
          scheduled: [],
          unscheduled: [],
          categories: [],
        }}
      />,
    )

    const scrollRegion = screen.getByTestId("event-workspace-sidebar-scroll-region")
    const bottomRegion = screen.getByTestId("event-workspace-sidebar-bottom-region")

    expect(within(scrollRegion).getByText("No scheduled nodes yet")).toBeTruthy()
    expect(within(scrollRegion).getByText("No unscheduled nodes")).toBeTruthy()
    expect(within(bottomRegion).getByText("No categories")).toBeTruthy()
  })
})
