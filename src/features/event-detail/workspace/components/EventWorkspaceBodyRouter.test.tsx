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
const focusedEditorMock = vi.fn<(props: unknown) => void>()
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

vi.mock("../../sections/FocusedTimeblockWorkspace", () => ({
  default: (props: unknown) => {
    focusedEditorMock(props)
    return <div data-testid="focused-timeblock-workspace" />
  },
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

function renderRouter({
  selectedNode,
  selectedTimeblockId = null,
}: {
  selectedNode: Parameters<typeof EventWorkspaceBodyRouter>[0]["selectedNode"]
  selectedTimeblockId?: string | null
}) {
  return render(
    <EventWorkspaceBodyRouter
      eventResource={baseEventResource}
      selectedNode={selectedNode}
      selectedTimeblockId={selectedTimeblockId}
      onSelectNode={vi.fn()}
      onNavigateToOverview={vi.fn()}
    />,
  )
}

describe("EventWorkspaceBodyRouter", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("renders an empty-state scroll container when no node is selected", () => {
    renderRouter({ selectedNode: null })
    expect(screen.getByText("Select a node from the left sidebar to begin.")).toBeTruthy()
  })

  it("renders category nodes inside the shared scroll container contract", () => {
    renderRouter({
      selectedNode: {
        id: "category:food",
        groupId: "categories",
        label: "Food",
        nodeType: "category",
        sourceRef: { kind: "category", categoryId: "food" },
      },
    })

    expect(screen.getByTestId("food-workspace-section")).toBeTruthy()
    expect(screen.getByTestId("food-workspace-section").parentElement?.className).toContain("h-full")
  })

  it("passes the shared event resource to the overview workspace", () => {
    renderRouter({
      selectedNode: {
        id: "category:overview",
        groupId: "categories",
        label: "Overview",
        nodeType: "category",
        sourceRef: { kind: "category", categoryId: "overview" },
      },
    })

    expect(screen.getByTestId("overview-workspace-section")).toBeTruthy()
    expect(overviewWorkspaceSectionMock).toHaveBeenCalledWith({
      eventResource: baseEventResource,
    })
  })

  it("renders tournament category content", () => {
    renderRouter({
      selectedNode: {
        id: "category:tournament",
        groupId: "categories",
        label: "Tournament",
        nodeType: "category",
        sourceRef: { kind: "category", categoryId: "tournament" },
      },
    })

    expect(screen.getByTestId("tournament-details-section")).toBeTruthy()
    expect(screen.getByTestId("golf-carts-section")).toBeTruthy()
  })

  it("renders financial nodes", () => {
    renderRouter({
      selectedNode: {
        id: "category:financial",
        groupId: "categories",
        label: "Financial",
        nodeType: "financial",
        sourceRef: { kind: "financial", view: "overview" },
      },
    })

    expect(screen.getByTestId("financial-workspace-section")).toBeTruthy()
  })

  it("renders note and setup timeblocks with the focused timeblock workspace", () => {
    renderRouter({
      selectedNode: {
        id: "unscheduled:tb-1",
        groupId: "unscheduled",
        label: "Doors",
        subLabel: "Note",
        nodeType: "timeblock",
        sectionType: SECTION_TYPE.NOTE,
        sourceRef: { kind: "timeblock", timeblockId: "tb-1" },
      },
      selectedTimeblockId: "tb-1",
    })

    expect(screen.getByTestId("focused-timeblock-workspace")).toBeTruthy()
    expect(focusedEditorMock).toHaveBeenCalledWith(
      expect.objectContaining({ timeblockId: "tb-1" }),
    )
  })

  it("renders setup instruction timeblocks with the focused timeblock workspace", () => {
    renderRouter({
      selectedNode: {
        id: "unscheduled:tb-setup",
        groupId: "unscheduled",
        label: "Buffet Setup",
        nodeType: "timeblock",
        sectionType: SECTION_TYPE.SETUP_INSTRUCTION,
        sourceRef: { kind: "timeblock", timeblockId: "tb-setup" },
      },
      selectedTimeblockId: "tb-setup",
    })

    expect(screen.getByTestId("focused-timeblock-workspace")).toBeTruthy()
    expect(focusedEditorMock).toHaveBeenCalledWith(
      expect.objectContaining({ timeblockId: "tb-setup" }),
    )
  })

  it("renders food timeblocks with the focused timeblock workspace", () => {
    renderRouter({
      selectedNode: {
        id: "scheduled:tb-2",
        groupId: "scheduled",
        label: "Lunch",
        nodeType: "timeblock",
        time: "12:00",
        sectionType: SECTION_TYPE.FOOD,
        sourceRef: { kind: "timeblock", timeblockId: "tb-2" },
      },
      selectedTimeblockId: "tb-2",
    })

    expect(screen.getByTestId("focused-timeblock-workspace")).toBeTruthy()
    expect(focusedEditorMock).toHaveBeenCalledWith(
      expect.objectContaining({ timeblockId: "tb-2" }),
    )
  })

  it("still renders the aggregate food workspace from the food category icon", () => {
    renderRouter({
      selectedNode: {
        id: "category:food",
        groupId: "categories",
        label: "Food",
        nodeType: "category",
        sourceRef: { kind: "category", categoryId: "food" },
      },
    })

    expect(screen.getByTestId("food-workspace-section")).toBeTruthy()
  })

  it("renders beverage timeblocks with the focused timeblock workspace", () => {
    renderRouter({
      selectedNode: {
        id: "scheduled:tb-bev",
        groupId: "scheduled",
        label: "Cocktail Hour",
        nodeType: "timeblock",
        time: "17:00",
        sectionType: SECTION_TYPE.BEVERAGE,
        sourceRef: { kind: "timeblock", timeblockId: "tb-bev" },
      },
      selectedTimeblockId: "tb-bev",
    })

    expect(screen.getByTestId("focused-timeblock-workspace")).toBeTruthy()
    expect(focusedEditorMock).toHaveBeenCalledWith(
      expect.objectContaining({ timeblockId: "tb-bev" }),
    )
  })

  it("still renders the aggregate beverage workspace from the beverage category icon", () => {
    renderRouter({
      selectedNode: {
        id: "category:beverage",
        groupId: "categories",
        label: "Beverage",
        nodeType: "category",
        sourceRef: { kind: "category", categoryId: "beverage" },
      },
    })

    expect(screen.getByTestId("beverage-workspace-section")).toBeTruthy()
  })

  it("renders cart detail timeblocks using the tournament workspace", () => {
    renderRouter({
      selectedNode: {
        id: "scheduled:tb-cart",
        groupId: "scheduled",
        label: "Carts",
        nodeType: "timeblock",
        sectionType: SECTION_TYPE.CART_DETAIL,
        sourceRef: { kind: "timeblock", timeblockId: "tb-cart" },
      },
    })

    expect(screen.getByTestId("tournament-details-section")).toBeTruthy()
    expect(screen.getByTestId("golf-carts-section")).toBeTruthy()
  })

  it("routes event start/end system nodes to overview", () => {
    renderRouter({
      selectedNode: {
        id: "scheduled:fake_timeblock_id_start",
        groupId: "scheduled",
        label: "Event Start",
        nodeType: "system",
        sourceRef: { kind: "system", source: "event_start", syntheticId: "fake_timeblock_id_start" },
      },
    })

    expect(screen.getByTestId("overview-workspace-section")).toBeTruthy()
  })

  it("routes tournament/cart system nodes to tournament workspace", () => {
    renderRouter({
      selectedNode: {
        id: "scheduled:fake_timeblock_id_cart_setup",
        groupId: "scheduled",
        label: "Cart Details",
        nodeType: "system",
        sourceRef: { kind: "system", source: "cart_detail", syntheticId: "fake_timeblock_id_cart_setup" },
      },
    })

    expect(screen.getByTestId("tournament-details-section")).toBeTruthy()
  })
})
