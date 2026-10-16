import { act, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes, useLocation } from "react-router"
import { describe, expect, it, vi } from "vitest"

import EventDetailPanelOrchestrator from "./EventDetailPanelOrchestrator"

const hotkeys = vi.hoisted(() => new Map<string, () => void>())
vi.mock("~/lib/hotKeys", () => ({
  useHotkey: (key: string, handler: () => void) => { hotkeys.set(key, handler) },
}))
vi.mock("~/hooks/useNoteSection", () => ({ useNoteSection: () => ({ isCreating: false }) }))
vi.mock("../workspace/components/EventWorkspaceSidebar", () => ({ default: () => null }))

function PreviewDestination() {
  const location = useLocation()
  return <p data-testid="return-to">{new URLSearchParams(location.search).get("returnTo")}</p>
}

describe("opening preview", () => {
  it.each(["button", "shortcut"])("preserves the full event route using the %s", (trigger) => {
    const origin = "/events/event-1/food?returnTo=%2Fcontacts%2Fcontact-1"
    render(
      <MemoryRouter initialEntries={[origin]}>
        <Routes>
          <Route path="/events/:id/:section" element={
            <EventDetailPanelOrchestrator
              eventType="function"
              navModel={{ scheduled: [], unscheduled: [], categories: [] }}
              selectedNodeId="category:food"
              selectedTimeblockId={null}
              selectedCategoryId="food"
              onSelectNode={vi.fn()}
              onSelectCategory={vi.fn()}
              onNavigateToNote={vi.fn()}
              onNavigateToOverview={vi.fn()}
            />
          } />
          <Route path="/preview/:id" element={<PreviewDestination />} />
        </Routes>
      </MemoryRouter>,
    )
    if (trigger === "button") {
      fireEvent.click(screen.getByRole("button", { name: "Open preview workspace" }))
    } else {
      act(() => hotkeys.get("Cmd+P")?.())
    }
    expect(screen.getByTestId("return-to").textContent).toBe(origin)
  })
})
