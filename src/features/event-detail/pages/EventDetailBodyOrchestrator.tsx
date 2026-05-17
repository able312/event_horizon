import { Body } from "~/components/layouts/SplitLayout"

import EventDetailHeaderBar from "./EventDetailHeaderBar"
import DetailsTitleBar from "../components/DetailsTitleBar"
import type { EventResource } from "../types"
import type { TimeblockWithItems, TimelineTimeblock } from "~/definitions/timeblocks/timeblocks-types"
import type { WorkspaceNavNode } from "../workspace/types"
import EventWorkspaceBodyRouter from "../workspace/components/EventWorkspaceBodyRouter"

interface EventDetailBodyOrchestratorProps {
  eventResource: EventResource
  selectedNode: WorkspaceNavNode | null
  onSelectNode: (nodeId: string) => void
  timelineRows: TimelineTimeblock[]
  sectionRows: TimeblockWithItems[]
}

const EventDetailBodyOrchestrator: React.FC<EventDetailBodyOrchestratorProps> = ({
  eventResource,
  selectedNode,
  onSelectNode,
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
            onSelectNode={onSelectNode}
          />
        </div>
      </Body.Content>
    </>
  )
}

export default EventDetailBodyOrchestrator
