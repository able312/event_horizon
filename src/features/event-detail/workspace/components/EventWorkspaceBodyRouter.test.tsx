import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import EventWorkspaceBodyRouter from "./EventWorkspaceBodyRouter"
import { SECTION_TYPE } from "~/definitions/timeblocks/timeblock-constants"

const foodWorkspaceSectionMock = vi.fn(() => <div data-testid="food-workspace-section" />)
const beverageWorkspaceSectionMock = vi.fn(() => <div data-testid="beverage-workspace-section" />)
const vendorsSectionMock = vi.fn(() => <div data-testid="vendors-section" />)
const setupInstructionsSectionMock = vi.fn(() => <div data-testid="setup-section" />)
const notesSectionMock = vi.fn(() => <div data-testid="notes-section" />)
const tournamentDetailsSectionMock = vi.fn(() => <div data-testid="tournament-details-section" />)
const golfCartsSectionMock = vi.fn(() => <div data-testid="golf-carts-section" />)
const financialWorkspaceSectionMock = vi.fn(() => <div data-testid="financial-workspace-section" />)

vi.mock("~/features/event-detail/sections/planning-workspace/FoodWorkspaceSection", () => ({
  default: () => foodWorkspaceSectionMock(),
}))

vi.mock("~/features/event-detail/sections/planning-workspace/BeverageWorkspaceSection", () => ({
  default: () => beverageWorkspaceSectionMock(),
}))

vi.mock("~/components/event-detail/detail-sections/sections/VendorsSection", () => ({
  default: () => vendorsSectionMock(),
}))

vi.mock("~/components/event-detail/detail-sections/sections/SetupInstructionsSection", () => ({
  default: () => setupInstructionsSectionMock(),
}))

vi.mock("~/components/event-detail/detail-sections/sections/NotesSection", () => ({
  default: () => notesSectionMock(),
}))

vi.mock("~/components/event-detail/detail-sections/sections/TournamentDetailsSection", () => ({
  default: () => tournamentDetailsSectionMock(),
}))

vi.mock("~/components/event-detail/detail-sections/sections/GolfCartsSection", () => ({
  default: () => golfCartsSectionMock(),
}))

vi.mock("./FinancialWorkspaceSection", () => ({
  default: (props: unknown) => {
    financialWorkspaceSectionMock(props)
    return <div data-testid="financial-workspace-section" />
  },
}))

const baseEventResource = {
  event: { id: "event-1", title: "Alpha" },
  isLoading: false,
  updateEvent: vi.fn(async () => ({ id: "event-1" } as never)),
  deleteEvent: vi.fn(async () => true),
}

function renderRouter(selectedNode: Parameters<typeof EventWorkspaceBodyRouter>[0]["selectedNode"]) {
  return render(
    <EventWorkspaceBodyRouter
      eventResource={baseEventResource}
      selectedNode={selectedNode}
      onSelectNode={vi.fn()}
      timelineRows={[
        {
          id: "tb-1",
          time: "09:00",
          title: "Doors",
          assignedTo: "Ops",
          sectionType: "note",
          eventId: "event-1",
          createdAt: "",
          updatedAt: "",
        },
      ]}
      sectionRows={[]}
    />,
  )
}

function expectScrollContainerForText(text: string) {
  const matchingContainer = Array.from(document.querySelectorAll("div")).find((element) => {
    const className = typeof element.className === "string" ? element.className : ""

    return (
      className.includes("h-full") &&
      className.includes("min-h-0") &&
      className.includes("overflow-y-auto") &&
      element.textContent?.includes(text)
    )
  })

  expect(matchingContainer?.className).toContain("h-full")
  expect(matchingContainer?.className).toContain("min-h-0")
  expect(matchingContainer?.className).toContain("overflow-y-auto")
}

describe("EventWorkspaceBodyRouter", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders an empty-state scroll container when no node is selected", () => {
    renderRouter(null)

    expectScrollContainerForText("Select a node from the left sidebar to begin.")
  })

  it("renders category nodes inside the shared scroll container contract", () => {
    renderRouter({
      id: "category:food",
      label: "Food",
      nodeType: "category",
      sourceRef: { kind: "category", categoryId: "food" },
    })

    expect(screen.getByTestId("food-workspace-section")).toBeTruthy()
    expect(screen.getByTestId("food-workspace-section").parentElement?.className).toContain("h-full")
    expect(screen.getByTestId("food-workspace-section").parentElement?.className).toContain("min-h-0")
    expect(screen.getByTestId("food-workspace-section").parentElement?.className).toContain("overflow-y-auto")
  })

  it("renders tournament category content inside the shared scroll container contract", () => {
    renderRouter({
      id: "category:tournament",
      label: "Tournament",
      nodeType: "category",
      sourceRef: { kind: "category", categoryId: "tournament" },
    })

    expect(screen.getByTestId("tournament-details-section")).toBeTruthy()
    expect(screen.getByTestId("golf-carts-section")).toBeTruthy()
    expect(screen.getByTestId("tournament-details-section").parentElement?.className).toContain("h-full")
    expect(screen.getByTestId("tournament-details-section").parentElement?.className).toContain("min-h-0")
    expect(screen.getByTestId("tournament-details-section").parentElement?.className).toContain("overflow-y-auto")
  })

  it("renders financial nodes inside the shared scroll container contract", () => {
    renderRouter({
      id: "financial:summary",
      label: "Financial",
      nodeType: "financial",
      sourceRef: { kind: "financial", view: "overview" },
    })

    expect(screen.getByTestId("financial-workspace-section")).toBeTruthy()
    expect(screen.getByTestId("financial-workspace-section").parentElement?.className).toContain("h-full")
    expect(screen.getByTestId("financial-workspace-section").parentElement?.className).toContain("min-h-0")
    expect(screen.getByTestId("financial-workspace-section").parentElement?.className).toContain("overflow-y-auto")
    expect(financialWorkspaceSectionMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: "event-1" }),
    )
  })

  it("renders timeblock note nodes using category workspace content", () => {
    renderRouter({
      id: "timeblock:tb-1",
      label: "Doors",
      subLabel: "Note",
      nodeType: "timeblock",
      time: "09:00",
      sectionType: SECTION_TYPE.NOTE,
      sourceRef: { kind: "timeblock", timeblockId: "tb-1" },
    })

    expect(screen.getByTestId("notes-section")).toBeTruthy()
    expect(screen.getByTestId("notes-section").parentElement?.className).toContain("h-full")
    expect(screen.getByTestId("notes-section").parentElement?.className).toContain("min-h-0")
    expect(screen.getByTestId("notes-section").parentElement?.className).toContain("overflow-y-auto")
  })

  it("renders timeblock food nodes using category workspace content", () => {
    renderRouter({
      id: "timeblock:tb-2",
      label: "Lunch",
      subLabel: "Food",
      nodeType: "timeblock",
      time: "12:00",
      sectionType: SECTION_TYPE.FOOD,
      sourceRef: { kind: "timeblock", timeblockId: "tb-2" },
    })

    expect(screen.getByTestId("food-workspace-section")).toBeTruthy()
  })

  it("renders beverage nodes using the beverage workspace content", () => {
    renderRouter({
      id: "timeblock:tb-4",
      label: "Bar Service",
      subLabel: "Beverage",
      nodeType: "timeblock",
      time: "13:00",
      sectionType: SECTION_TYPE.BEVERAGE,
      sourceRef: { kind: "timeblock", timeblockId: "tb-4" },
    })

    expect(screen.getByTestId("beverage-workspace-section")).toBeTruthy()
  })

  it("renders a fallback for unsupported timeblock categories", () => {
    renderRouter({
      id: "timeblock:tb-3",
      label: "Unknown",
      nodeType: "timeblock",
      sourceRef: { kind: "timeblock", timeblockId: "tb-3" },
    })

    expect(screen.getByText("Unsupported timeblock category.")).toBeTruthy()
  })

  it("keeps system nodes read-only", () => {
    renderRouter({
      id: "system:event-start",
      label: "Event Start",
      nodeType: "system",
      sourceRef: { kind: "system", source: "event_start", syntheticId: "event-start" },
    })

    expect(screen.getByText("System timeline node")).toBeTruthy()
  })
})
