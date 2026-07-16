import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import EventWorkspaceBodyRouter from "./EventWorkspaceBodyRouter"
import type { Event } from "~/definitions/database"
import { SECTION_TYPE } from "~/definitions/timeblocks/timeblock-constants"
import type { EventResource } from "~/features/event-detail/types"

const overviewWorkspaceSectionMock = vi.fn<(props: unknown) => void>()
const foodWorkspaceSectionMock = vi.fn(() => <div data-testid="food-workspace-section" />)
const beverageWorkspaceSectionMock = vi.fn(() => <div data-testid="beverage-workspace-section" />)
const vendorsSectionMock = vi.fn(() => <div data-testid="vendors-section" />)
const setupInstructionsSectionMock = vi.fn(() => <div data-testid="setup-section" />)
const notesSectionMock = vi.fn(() => <div data-testid="notes-section" />)
const tournamentDetailsSectionMock = vi.fn(() => <div data-testid="tournament-details-section" />)
const golfCartsSectionMock = vi.fn(() => <div data-testid="golf-carts-section" />)
const financialWorkspaceSectionMock = vi.fn<(props: unknown) => void>()

vi.mock("../../sections/event-overview/OverviewWorkspaceSection", () => ({
  default: (props: unknown) => {
    overviewWorkspaceSectionMock(props)
    return <div data-testid="overview-workspace-section" />
  },
}))

vi.mock("~/features/event-detail/sections/food-beverage-workspaces/FoodWorkspaceSection", () => ({
  default: () => foodWorkspaceSectionMock(),
}))

vi.mock("~/features/event-detail/sections/food-beverage-workspaces/BeverageWorkspaceSection", () => ({
  default: () => beverageWorkspaceSectionMock(),
}))

vi.mock("~/features/event-detail/sections/vendor-workspace/VendorWorkspaceSection", () => ({
  default: () => vendorsSectionMock(),
}))

vi.mock("~/features/event-detail/sections/setup-notes-workspaces/SetupWorkspaceSection", () => ({
  default: () => setupInstructionsSectionMock(),
}))

vi.mock("~/features/event-detail/sections/setup-notes-workspaces/NotesWorkspaceSection", () => ({
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

const baseEvent: Event = {
  id: "event-1",
  title: "Alpha",
  type: "function",
  status: "planning",
  startDateTime: null,
  endDateTime: null,
  clientName: null,
  clientEmail: null,
  clientPhone: null,
  minGuests: null,
  maxGuests: null,
  guestCountFinal: null,
  driveFolderId: null,
  calendarId: null,
  clientNotes: null,
  internalNotes: null,
  isInternal: 0,
  createdAt: "created",
  updatedAt: null,
}

const baseEventResource = {
  event: baseEvent,
  isLoading: false,
  updateEvent: vi.fn(async (updates) => ({ ...baseEvent, ...updates })),
  deleteEvent: vi.fn(async () => true),
} satisfies EventResource

function renderRouter(selectedNode: Parameters<typeof EventWorkspaceBodyRouter>[0]["selectedNode"]) {
  return render(
    <EventWorkspaceBodyRouter
      eventResource={baseEventResource}
      selectedNode={selectedNode}
      onSelectNode={vi.fn()}
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
    vi.clearAllMocks()
  })

  it("renders an empty-state scroll container when no node is selected", () => {
    renderRouter(null)

    expectScrollContainerForText("Select a node from the left sidebar to begin.")
  })

  it("renders category nodes inside the shared scroll container contract", () => {
    renderRouter({
      id: "category:food",
      groupId: "categories",
      label: "Food",
      nodeType: "category",
      sourceRef: { kind: "category", categoryId: "food" },
    })

    expect(screen.getByTestId("food-workspace-section")).toBeTruthy()
    expect(screen.getByTestId("food-workspace-section").parentElement?.className).toContain("h-full")
    expect(screen.getByTestId("food-workspace-section").parentElement?.className).toContain("min-h-0")
    expect(screen.getByTestId("food-workspace-section").parentElement?.className).toContain("overflow-y-auto")
  })

  it("passes the shared event resource to the overview workspace", () => {
    renderRouter({
      id: "category:overview",
      groupId: "categories",
      label: "Overview",
      nodeType: "category",
      sourceRef: { kind: "category", categoryId: "overview" },
    })

    expect(screen.getByTestId("overview-workspace-section")).toBeTruthy()
    expect(overviewWorkspaceSectionMock).toHaveBeenCalledWith({
      eventResource: baseEventResource,
    })
  })

  it("renders tournament category content inside the shared scroll container contract", () => {
    renderRouter({
      id: "category:tournament",
      groupId: "categories",
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
      groupId: "categories",
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
      groupId: "scheduled",
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
      groupId: "scheduled",
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
      groupId: "scheduled",
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
      groupId: "scheduled",
      label: "Unknown",
      nodeType: "timeblock",
      sourceRef: { kind: "timeblock", timeblockId: "tb-3" },
    })

    expect(screen.getByText("Unsupported timeblock category.")).toBeTruthy()
  })

  it("keeps system nodes read-only", () => {
    renderRouter({
      id: "system:event-start",
      groupId: "scheduled",
      label: "Event Start",
      nodeType: "system",
      sourceRef: { kind: "system", source: "event_start", syntheticId: "event-start" },
    })

    expect(screen.getByText("System timeline node")).toBeTruthy()
  })
})
