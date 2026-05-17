import { SplitLayout } from "~/components/layouts/SplitLayout"
import { useCallback } from "react"

import RouteBlockingError from "~/components/ui/route-blocking-error"

import EventDetailPanelOrchestrator from "./panels/EventDetailPanelOrchestrator"
import EventDetailBodyOrchestrator from "./pages/EventDetailBodyOrchestrator"
import type { EventResource } from "./types"
import { useEventWorkspaceData } from "./workspace/hooks/useEventWorkspaceData"
import { useWorkspaceSelection } from "./workspace/hooks/useWorkspaceSelection"

const EventDetailWorkspace: React.FC = () => {
  const workspaceData = useEventWorkspaceData()
  const selection = useWorkspaceSelection(workspaceData.navModel)

  const eventResource: EventResource = {
    event: workspaceData.event,
    isLoading: workspaceData.isLoading,
    updateEvent: workspaceData.updateEvent,
    deleteEvent: workspaceData.deleteEvent,
  }

  const handleRetryLoad = useCallback(async () => {
    await workspaceData.refetchAll()
  }, [workspaceData])

  if (workspaceData.error) {
    return (
      <RouteBlockingError
        title="Could not load event workspace"
        description="Event detail data is temporarily unavailable. Please retry."
        onRetry={handleRetryLoad}
        isRetrying={workspaceData.isFetching}
      />
    )
  }

  return (
    <SplitLayout>
      <SplitLayout.PanelWrapper>
        <EventDetailPanelOrchestrator
          eventTitle={workspaceData.event?.title ?? "Event Workspace"}
          navModel={workspaceData.navModel}
          selectedNodeId={selection.selectedNodeId}
          onSelectNode={selection.setSelectedNodeId}
        />
      </SplitLayout.PanelWrapper>

      <SplitLayout.BodyWrapper>
        <EventDetailBodyOrchestrator
          eventResource={eventResource}
          selectedNode={selection.selectedNode}
          onSelectNode={selection.setSelectedNodeId}
          timelineRows={workspaceData.timelineRows}
          sectionRows={workspaceData.sectionRows}
        />
      </SplitLayout.BodyWrapper>
    </SplitLayout>
  )
}

export default EventDetailWorkspace
