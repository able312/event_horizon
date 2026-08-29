import WorkspaceNavGroup from "./WorkspaceNavGroup"
import WorkspaceCategoryIconMenu from "./WorkspaceCategoryIconMenu"
import type { WorkspaceCategoryId, WorkspaceNavModel } from "../types"

interface EventWorkspaceSidebarProps {
  navModel: WorkspaceNavModel
  eventType: string | undefined
  selectedNodeId: string | null
  selectedTimeblockId: string | null
  selectedCategoryId: WorkspaceCategoryId | null
  onSelectNode: (nodeId: string) => void
  onSelectCategory: (categoryId: WorkspaceCategoryId) => void
  searchQuery: string
}

const EventWorkspaceSidebar: React.FC<EventWorkspaceSidebarProps> = ({
  navModel,
  eventType,
  selectedNodeId,
  selectedTimeblockId,
  selectedCategoryId,
  onSelectNode,
  onSelectCategory,
  searchQuery,
}) => {
  const isFiltering = searchQuery.trim().length > 0
  const scheduledEmpty = isFiltering ? "No scheduled matches" : "No scheduled nodes yet"
  const unscheduledEmpty = isFiltering ? "No unscheduled matches" : "No unscheduled nodes"

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className="flex-1 min-h-0 overflow-y-auto px-3 pt-4 pb-3 space-y-6"
        data-testid="event-workspace-sidebar-scroll-region"
      >
        <WorkspaceNavGroup
          title="Scheduled Timeline"
          emptyCopy={scheduledEmpty}
          nodes={navModel.scheduled}
          selectedNodeId={selectedNodeId}
          selectedTimeblockId={selectedTimeblockId}
          onSelectNode={onSelectNode}
        />

        <WorkspaceNavGroup
          title="Unscheduled Queue"
          emptyCopy={unscheduledEmpty}
          nodes={navModel.unscheduled}
          selectedNodeId={selectedNodeId}
          selectedTimeblockId={selectedTimeblockId}
          onSelectNode={onSelectNode}
        />
      </div>

      <div
        className="shrink-0 border-t border-white/10 px-3 py-3"
        data-testid="event-workspace-sidebar-bottom-region"
      >
        <div className="rounded-lg bg-white/5 px-2 py-2">
          <WorkspaceCategoryIconMenu
            eventType={eventType}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={onSelectCategory}
          />
        </div>
      </div>
    </div>
  )
}

export default EventWorkspaceSidebar
