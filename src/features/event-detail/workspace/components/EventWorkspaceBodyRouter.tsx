import OverviewWorkspaceSection from "../../sections/event-overview/OverviewWorkspaceSection"
import TournamentDetailsSection from "~/components/event-detail/detail-sections/sections/TournamentDetailsSection"
import GolfCartsSection from "~/components/event-detail/detail-sections/sections/GolfCartsSection"
import FinancialWorkspaceSection from "./FinancialWorkspaceSection"
import FoodWorkspaceSection from "~/features/event-detail/sections/food-beverage-workspaces/FoodWorkspaceSection"
import BeverageWorkspaceSection from "~/features/event-detail/sections/food-beverage-workspaces/BeverageWorkspaceSection"
import VendorWorkspaceSection from "../../sections/vendor-workspace/VendorWorkspaceSection"
import FocusedTimeblockWorkspace from "../../sections/FocusedTimeblockWorkspace"

import type { EventResource } from "~/features/event-detail/types"
import {
  getNavigationTarget,
  getTimeblockIdFromNode,
  isFocusedTimeblockSectionType,
} from "../lib/navPolicy"
import type { WorkspaceCategoryId, WorkspaceNavNode } from "../types"

interface EventWorkspaceBodyRouterProps {
  eventResource: EventResource
  selectedNode: WorkspaceNavNode | null
  selectedTimeblockId: string | null
  onSelectNode: (nodeId: string) => void
  onNavigateToOverview: () => void
}

const scrollContainerClassName = "h-full min-h-0 overflow-y-auto bg-stone-100"

function renderCategoryWorkspace(
  categoryId: WorkspaceCategoryId,
  eventResource: EventResource,
  onSelectNode: (nodeId: string) => void,
) {
  switch (categoryId) {
    case "overview":
      return (
        <div className={`${scrollContainerClassName} p-4`}>
          <OverviewWorkspaceSection eventResource={eventResource} />
        </div>
      )
    case "food":
      return (
        <div className={`${scrollContainerClassName} p-4`}>
          <FoodWorkspaceSection />
        </div>
      )
    case "beverage":
      return (
        <div className={`${scrollContainerClassName} p-4`}>
          <BeverageWorkspaceSection />
        </div>
      )
    case "logistics":
      return (
        <div className={`${scrollContainerClassName} p-4`}>
          <VendorWorkspaceSection />
        </div>
      )
    case "tournament":
      return (
        <div className={`${scrollContainerClassName} p-4 space-y-6`}>
          <TournamentDetailsSection />
          <GolfCartsSection />
        </div>
      )
    case "financial":
      return (
        <div className={`${scrollContainerClassName} p-4 pt-8 space-y-6`}>
          <FinancialWorkspaceSection
            eventId={eventResource.event?.id ?? ""}
            onSelectWorkspaceNode={onSelectNode}
          />
        </div>
      )
    default: {
      const _exhaustive: never = categoryId
      return (
        <div className={`${scrollContainerClassName} p-4`}>
          <p className="text-sm text-muted-foreground">Unsupported category: {String(_exhaustive)}</p>
        </div>
      )
    }
  }
}

const EventWorkspaceBodyRouter: React.FC<EventWorkspaceBodyRouterProps> = ({
  eventResource,
  selectedNode,
  selectedTimeblockId,
  onSelectNode,
  onNavigateToOverview,
}) => {
  if (!selectedNode && !selectedTimeblockId) {
    return (
      <div className={`${scrollContainerClassName} p-4`}>
        <p className="text-sm text-muted-foreground">Select a node from the left sidebar to begin.</p>
      </div>
    )
  }

  const focusedTimeblockId =
    selectedTimeblockId ??
    (selectedNode && isFocusedTimeblockSectionType(selectedNode.sectionType)
      ? getTimeblockIdFromNode(selectedNode)
      : null)

  if (
    focusedTimeblockId &&
    (!selectedNode || isFocusedTimeblockSectionType(selectedNode.sectionType))
  ) {
    return (
      <FocusedTimeblockWorkspace
        key={focusedTimeblockId}
        timeblockId={focusedTimeblockId}
        onDeleted={onNavigateToOverview}
        onNotFound={onNavigateToOverview}
      />
    )
  }

  if (!selectedNode) {
    return (
      <div className={`${scrollContainerClassName} p-4`}>
        <p className="text-sm text-muted-foreground">Select a node from the left sidebar to begin.</p>
      </div>
    )
  }

  const target = getNavigationTarget(selectedNode)

  if (target.kind === "focused-timeblock") {
    return (
      <FocusedTimeblockWorkspace
        key={target.timeblockId}
        timeblockId={target.timeblockId}
        onDeleted={onNavigateToOverview}
        onNotFound={onNavigateToOverview}
      />
    )
  }

  return renderCategoryWorkspace(target.categoryId, eventResource, onSelectNode)
}

export default EventWorkspaceBodyRouter
