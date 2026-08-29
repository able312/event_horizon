import { Plus, Search } from "lucide-react"
import { useCallback, useRef, useState } from "react"

import { Panel } from "~/components/layouts/SplitLayout"
import { Button } from "~/components/atoms/button"
import { useHotkey } from "~/lib/hotKeys"
import { useNoteSection } from "~/hooks/useNoteSection"
import EventWorkspaceSidebar from "../workspace/components/EventWorkspaceSidebar"
import { useWorkspaceNavFilter } from "../workspace/hooks/useWorkspaceNavFilter"
import type { WorkspaceCategoryId, WorkspaceNavModel } from "../workspace/types"

interface EventDetailPanelOrchestratorProps {
  eventType: string | undefined
  navModel: WorkspaceNavModel
  selectedNodeId: string | null
  selectedTimeblockId: string | null
  selectedCategoryId: WorkspaceCategoryId | null
  onSelectNode: (nodeId: string) => void
  onSelectCategory: (categoryId: WorkspaceCategoryId) => void
  onNavigateToNote: (timeblockId: string) => void
  onNavigateToOverview: () => void
}

const EventDetailPanelOrchestrator: React.FC<EventDetailPanelOrchestratorProps> = ({
  eventType,
  navModel,
  selectedNodeId,
  selectedTimeblockId,
  selectedCategoryId,
  onSelectNode,
  onSelectCategory,
  onNavigateToNote,
  onNavigateToOverview,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const { addNoteAsync, isCreating } = useNoteSection()
  const filteredNav = useWorkspaceNavFilter(navModel, searchQuery)

  const focusSearch = useCallback(() => {
    searchInputRef.current?.focus()
    searchInputRef.current?.select()
  }, [])

  const handleCreateNote = useCallback(async () => {
    if (isCreating) return

    try {
      const created = await addNoteAsync({
        title: "",
        details: "",
      })
      onNavigateToNote(created.id)
    } catch {
      // Mutation already shows a sonner error toast.
      onNavigateToOverview()
    }
  }, [addNoteAsync, isCreating, onNavigateToNote, onNavigateToOverview])

  useHotkey("Cmd+f", focusSearch)
  useHotkey("Cmd+N", () => {
    void handleCreateNote()
  })

  return (
    <>
      <Panel.Header>
        <div className="flex w-full items-center gap-2 min-w-0">
          <div className="relative flex-1 min-w-0">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search…"
              aria-label="Search timeline nodes"
              className="h-7 w-full rounded-full border border-white/15 bg-white/5 py-1 pl-8 pr-3 text-xs text-stone-100 placeholder:text-stone-400 focus:border-white/30 focus:outline-none"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Create new note"
            disabled={isCreating}
            onClick={() => {
              void handleCreateNote()
            }}
            className="shrink-0 text-orange-500 hover:text-orange-400"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </Panel.Header>

      <Panel.Content>
        <EventWorkspaceSidebar
          navModel={{
            scheduled: filteredNav.scheduled,
            unscheduled: filteredNav.unscheduled,
            categories: filteredNav.categories,
          }}
          eventType={eventType}
          selectedNodeId={selectedNodeId}
          selectedTimeblockId={selectedTimeblockId}
          selectedCategoryId={selectedCategoryId}
          onSelectNode={onSelectNode}
          onSelectCategory={onSelectCategory}
          searchQuery={searchQuery}
        />
      </Panel.Content>
    </>
  )
}

export default EventDetailPanelOrchestrator
