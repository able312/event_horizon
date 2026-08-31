import { Search } from "lucide-react"
import type { RefObject } from "react"

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
  searchInputRef: RefObject<HTMLInputElement | null>
  onSearchQueryChange: (query: string) => void
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
  searchInputRef,
  onSearchQueryChange,
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
        <div className="sticky top-0 z-10 -mx-3 bg-stone-900 px-3 pb-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder="Search…"
              aria-label="Search timeline nodes"
              className="h-8 w-full rounded-full border border-white/15 bg-white/5 py-1 pl-8 pr-3 text-xs text-stone-100 placeholder:text-stone-400 focus:border-white/30 focus:outline-none"
            />
          </div>
        </div>

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
