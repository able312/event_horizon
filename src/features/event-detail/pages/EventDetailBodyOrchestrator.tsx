import { Body } from "~/components/layouts/SplitLayout"

import EventDetailHeaderBar from "./EventDetailHeaderBar"
import DetailsTitleBar from "../components/DetailsTitleBar"
import type { EventResource } from "../types"
import type { WorkspaceCategoryId, WorkspaceNavNode } from "../workspace/types"
import EventWorkspaceBodyRouter from "../workspace/components/EventWorkspaceBodyRouter"

interface EventDetailBodyOrchestratorProps {
  eventResource: EventResource
  selectedNode: WorkspaceNavNode | null
  selectedTimeblockId: string | null
  selectedCategoryId: WorkspaceCategoryId | null
  onSelectNode: (nodeId: string) => void
  onNavigateToOverview: () => void
}

const EventDetailBodyOrchestrator: React.FC<EventDetailBodyOrchestratorProps> = ({
  eventResource,
  selectedNode,
  selectedTimeblockId,
  onSelectNode,
  onNavigateToOverview,
}) => {
  return (
    <>
      <Body.Header>
        <EventDetailHeaderBar eventResource={eventResource} />
      </Body.Header>

      <Body.Content>
        <DetailsTitleBar eventResource={eventResource} />
        <div className="flex-1 min-h-0 overflow-hidden">
          <EventWorkspaceBodyRouter
            eventResource={eventResource}
            selectedNode={selectedNode}
            selectedTimeblockId={selectedTimeblockId}
            onSelectNode={onSelectNode}
            onNavigateToOverview={onNavigateToOverview}
          />
        </div>
      </Body.Content>
    </>
  )
}

export default EventDetailBodyOrchestrator
