
import OverviewWorkspaceSection from "../../sections/event-overview/OverviewWorkspaceSection"
import TournamentDetailsSection from "~/components/event-detail/detail-sections/sections/TournamentDetailsSection"
import GolfCartsSection from "~/components/event-detail/detail-sections/sections/GolfCartsSection"
import FinancialWorkspaceSection from "./FinancialWorkspaceSection"
import FoodWorkspaceSection from "~/features/event-detail/sections/food-beverage-workspaces/FoodWorkspaceSection"
import BeverageWorkspaceSection from "~/features/event-detail/sections/food-beverage-workspaces/BeverageWorkspaceSection"

import type { EventResource } from "~/features/event-detail/types"
import { getWorkspaceCategoryIdForSectionType } from "../lib/getWorkspaceCategoryIdForSectionType"
import type { WorkspaceCategoryId, WorkspaceNavNode } from "../types"
import VendorWorkspaceSection from "../../sections/vendor-workspace/VendorWorkspaceSection"
import SetupWorkspaceSection from "../../sections/setup-notes-workspaces/SetupWorkspaceSection"
import NoteWorkspaceSection from "../../sections/setup-notes-workspaces/NotesWorkspaceSection"

interface EventWorkspaceBodyRouterProps {
  eventResource: EventResource
  selectedNode: WorkspaceNavNode | null
  onSelectNode: (nodeId: string) => void
}

const scrollContainerClassName = "h-full min-h-0 overflow-y-auto bg-[##F5F5F4]"

function renderCategoryWorkspace(
  categoryId: WorkspaceCategoryId,
  eventResource: EventResource,
  onSelectNode: (nodeId: string) => void,
) {
  switch (categoryId) {
    case "overview":
      return <div className={`${scrollContainerClassName} p-4`}><OverviewWorkspaceSection /></div>
    case "food":
      return <div className={`${scrollContainerClassName} p-4`}><FoodWorkspaceSection /></div>
    case "beverage":
      return <div className={`${scrollContainerClassName} p-4`}><BeverageWorkspaceSection /></div>
    case "logistics":
      return <div className={`${scrollContainerClassName} p-4`}><VendorWorkspaceSection /></div>
    case "setup":
      return <div className={`${scrollContainerClassName} p-4`}><SetupWorkspaceSection /></div>
    case "notes":
      return <div className={`${scrollContainerClassName} p-4`}><NoteWorkspaceSection /></div>
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
    default:
      return (
        <div className={`${scrollContainerClassName} p-4`}>
          <p className="text-sm text-muted-foreground">Unsupported category node.</p>
        </div>
      )
  }
}

const EventWorkspaceBodyRouter: React.FC<EventWorkspaceBodyRouterProps> = ({
  eventResource,
  selectedNode,
  onSelectNode,
}) => {
  if (!selectedNode) {
    return (
      <div className={`${scrollContainerClassName} p-4`}>
        <p className="text-sm text-muted-foreground">Select a node from the left sidebar to begin.</p>
      </div>
    )
  }

  if (selectedNode.nodeType === "timeblock") {
    const categoryId = getWorkspaceCategoryIdForSectionType(selectedNode.sectionType)

    if (categoryId) {
      return renderCategoryWorkspace(categoryId, eventResource, onSelectNode)
    }

    return (
      <div className={`${scrollContainerClassName} p-4`}>
        <p className="text-sm text-muted-foreground">Unsupported timeblock category.</p>
      </div>
    )
  }

  if (selectedNode.nodeType === "system") {
    return (
      <div className={`${scrollContainerClassName} p-4`}>
        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-base font-semibold">{selectedNode.label}</h3>
          <p className="text-sm text-muted-foreground mt-1">System timeline node</p>
          <p className="text-xs text-muted-foreground mt-2">Read-only in this phase.</p>
        </div>
      </div>
    )
  }

  if (selectedNode.nodeType === "financial") {
    return renderCategoryWorkspace("financial", eventResource, onSelectNode)
  }

  if (selectedNode.nodeType === "category" && selectedNode.sourceRef.kind === "category") {
    return renderCategoryWorkspace(selectedNode.sourceRef.categoryId, eventResource, onSelectNode)
  }

  return (
    <div className={`${scrollContainerClassName} p-4`}>
      <p className="text-sm text-muted-foreground">No renderer for this node type.</p>
    </div>
  )
}

export default EventWorkspaceBodyRouter
