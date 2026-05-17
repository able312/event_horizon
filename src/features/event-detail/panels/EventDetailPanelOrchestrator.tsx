import { Panel } from "~/components/layouts/SplitLayout"

import EventWorkspaceSidebar from "../workspace/components/EventWorkspaceSidebar"
import type { WorkspaceNavModel } from "../workspace/types"

interface EventDetailPanelOrchestratorProps {
  eventTitle: string
  navModel: WorkspaceNavModel
  selectedNodeId: string | null
  onSelectNode: (nodeId: string) => void
}

const EventDetailPanelOrchestrator: React.FC<EventDetailPanelOrchestratorProps> = ({
  eventTitle,
  navModel,
  selectedNodeId,
  onSelectNode,
}) => {
  return (
    <>
      <Panel.Header>
        <span className="text-xs text-stone-400 truncate">{eventTitle}</span>
      </Panel.Header>

      <Panel.Content>
        <EventWorkspaceSidebar
          navModel={navModel}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
        />
      </Panel.Content>
    </>
  )
}

export default EventDetailPanelOrchestrator
