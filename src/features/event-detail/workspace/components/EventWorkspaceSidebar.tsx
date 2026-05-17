import WorkspaceNavGroup from "./WorkspaceNavGroup"
import type { WorkspaceNavModel } from "../types"

interface EventWorkspaceSidebarProps {
  navModel: WorkspaceNavModel
  selectedNodeId: string | null
  onSelectNode: (nodeId: string) => void
}

const EventWorkspaceSidebar: React.FC<EventWorkspaceSidebarProps> = ({
  navModel,
  selectedNodeId,
  onSelectNode,
}) => {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className="flex-1 min-h-0 overflow-y-auto px-3 pt-4 pb-3 space-y-6"
        data-testid="event-workspace-sidebar-scroll-region"
      >
        <WorkspaceNavGroup
          title="Scheduled Timeline"
          emptyCopy="No scheduled nodes yet"
          nodes={navModel.scheduled}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
        />

        <WorkspaceNavGroup
          title="Unscheduled Queue"
          emptyCopy="No unscheduled nodes"
          nodes={navModel.unscheduled}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
        />
      </div>

      <div
        className="shrink-0 border-t border-white/10 px-3 py-3"
        data-testid="event-workspace-sidebar-bottom-region"
      >
        <div className="rounded-lg bg-white/5 p-3">
          <WorkspaceNavGroup
            title="Categories"
            emptyCopy="No categories"
            nodes={navModel.categories}
            selectedNodeId={selectedNodeId}
            onSelectNode={onSelectNode}
          />
        </div>
      </div>
    </div>
  )
}

export default EventWorkspaceSidebar
