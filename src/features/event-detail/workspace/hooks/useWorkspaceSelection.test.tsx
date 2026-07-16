import { act, cleanup, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, describe, expect, it } from "vitest"

import { useWorkspaceSelection } from "./useWorkspaceSelection"
import { SECTION_TYPE } from "~/definitions/timeblocks/timeblock-constants"
import type { WorkspaceNavModel } from "../types"

interface SelectionHarnessProps {
  navModel: WorkspaceNavModel
}

function SelectionHarness({ navModel }: SelectionHarnessProps) {
  const selection = useWorkspaceSelection(navModel)

  return (
    <div>
      <div data-testid="selected-node-id">{selection.selectedNodeId ?? ""}</div>
      <button type="button" onClick={() => selection.setSelectedNodeId("scheduled:food")}>
        select-scheduled-food
      </button>
      <button type="button" onClick={() => selection.setSelectedNodeId("unscheduled:note")}>
        select-unscheduled-note
      </button>
      <button type="button" onClick={() => selection.setSelectedNodeId("scheduled:vendor")}>
        select-scheduled-vendor
      </button>
      <button type="button" onClick={() => selection.setSelectedNodeId("scheduled:cart")}>
        select-scheduled-cart
      </button>
      <button type="button" onClick={() => selection.setSelectedNodeId("system:start")}>
        select-system
      </button>
      <button type="button" onClick={() => selection.setSelectedNodeId("category:food")}>
        select-category
      </button>
      <button type="button" onClick={() => selection.setSelectedNodeId("category:financial")}>
        select-financial
      </button>
      <button type="button" onClick={() => selection.setSelectedNodeId("scheduled:tournament")}>
        select-scheduled-tournament
      </button>
    </div>
  )
}

function buildNavModel(overrides?: Partial<WorkspaceNavModel>): WorkspaceNavModel {
  return {
    scheduled: [
      { id: "scheduled:food", groupId: "scheduled", nodeType: "timeblock", label: "Lunch", sectionType: SECTION_TYPE.FOOD, sourceRef: { kind: "timeblock", timeblockId: "tb-food" } },
      { id: "scheduled:vendor", groupId: "scheduled", nodeType: "timeblock", label: "AV", sectionType: SECTION_TYPE.VENDOR, sourceRef: { kind: "timeblock", timeblockId: "tb-vendor" } },
      { id: "scheduled:cart", groupId: "scheduled", nodeType: "timeblock", label: "Carts", sectionType: SECTION_TYPE.CART_DETAIL, sourceRef: { kind: "timeblock", timeblockId: "tb-cart" } },
      { id: "scheduled:tournament", groupId: "scheduled", nodeType: "timeblock", label: "Bracket", sectionType: SECTION_TYPE.TOURNAMENT_DETAIL, sourceRef: { kind: "timeblock", timeblockId: "tb-tournament" } },
      { id: "system:start", groupId: "scheduled", nodeType: "system", label: "Event Start", sourceRef: { kind: "system", source: "event_start", syntheticId: "system-start" } },
    ],
    unscheduled: [
      { id: "unscheduled:note", groupId: "unscheduled", nodeType: "timeblock", label: "Reminder", sectionType: SECTION_TYPE.NOTE, sourceRef: { kind: "timeblock", timeblockId: "tb-note" } },
    ],
    categories: [
      { id: "category:overview", groupId: "categories", nodeType: "category", label: "Overview", sourceRef: { kind: "category", categoryId: "overview" } },
      { id: "category:food", groupId: "categories", nodeType: "category", label: "Food", sourceRef: { kind: "category", categoryId: "food" } },
      { id: "category:logistics", groupId: "categories", nodeType: "category", label: "Logistics", sourceRef: { kind: "category", categoryId: "logistics" } },
      { id: "category:notes", groupId: "categories", nodeType: "category", label: "Notes", sourceRef: { kind: "category", categoryId: "notes" } },
      { id: "category:tournament", groupId: "categories", nodeType: "category", label: "Tournament", sourceRef: { kind: "category", categoryId: "tournament" } },
      { id: "category:financial", groupId: "categories", nodeType: "financial", label: "Financial", sourceRef: { kind: "financial", view: "overview" } },
    ],
    ...overrides,
  }
}

function renderSelectionHarness(
  navModel: WorkspaceNavModel,
  initialEntry = "/events/evt_1",
) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/events/:id/:section?" element={<SelectionHarness navModel={navModel} />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe("useWorkspaceSelection", () => {
  afterEach(() => {
    cleanup()
  })

  it("defaults an incomplete event route to Overview", async () => {
    renderSelectionHarness(buildNavModel())

    await waitFor(() => {
      expect(screen.getByTestId("selected-node-id").textContent).toBe("category:overview")
    })
  })

  it("normalizes scheduled and unscheduled timeblock selections to their categories", async () => {
    renderSelectionHarness(buildNavModel(), "/events/evt_1/food")

    act(() => {
      screen.getByRole("button", { name: "select-scheduled-food" }).click()
    })
    expect(screen.getByTestId("selected-node-id").textContent).toBe("category:food")

    act(() => {
      screen.getByRole("button", { name: "select-unscheduled-note" }).click()
    })
    expect(screen.getByTestId("selected-node-id").textContent).toBe("category:notes")
  })

  it("maps vendor and cart detail timeblocks to logistics", async () => {
    renderSelectionHarness(buildNavModel(), "/events/evt_1/food")

    act(() => {
      screen.getByRole("button", { name: "select-scheduled-vendor" }).click()
    })
    expect(screen.getByTestId("selected-node-id").textContent).toBe("category:logistics")

    act(() => {
      screen.getByRole("button", { name: "select-scheduled-cart" }).click()
    })
    expect(screen.getByTestId("selected-node-id").textContent).toBe("category:logistics")
  })

  it("leaves system, category, and financial selections unchanged", async () => {
    renderSelectionHarness(buildNavModel(), "/events/evt_1/food")

    act(() => {
      screen.getByRole("button", { name: "select-system" }).click()
    })
    expect(screen.getByTestId("selected-node-id").textContent).toBe("system:start")

    act(() => {
      screen.getByRole("button", { name: "select-category" }).click()
    })
    expect(screen.getByTestId("selected-node-id").textContent).toBe("category:food")

    act(() => {
      screen.getByRole("button", { name: "select-financial" }).click()
    })
    expect(screen.getByTestId("selected-node-id").textContent).toBe("category:financial")
  })

  it("falls back to the original timeblock selection when the mapped category is missing", async () => {
    renderSelectionHarness(
      buildNavModel({
        categories: [
          { id: "category:food", groupId: "categories", nodeType: "category", label: "Food", sourceRef: { kind: "category", categoryId: "food" } },
          { id: "category:financial", groupId: "categories", nodeType: "financial", label: "Financial", sourceRef: { kind: "financial", view: "overview" } },
        ],
      }),
      "/events/evt_1/food",
    )

    act(() => {
      screen.getByRole("button", { name: "select-scheduled-tournament" }).click()
    })
    expect(screen.getByTestId("selected-node-id").textContent).toBe("scheduled:tournament")
  })
})
