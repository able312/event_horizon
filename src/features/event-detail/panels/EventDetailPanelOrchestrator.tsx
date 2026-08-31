import { FileText, Plus } from "lucide-react"
import { useCallback, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router"

import { Panel } from "~/components/layouts/SplitLayout"
import { Button } from "~/components/atoms/button"
import { useHotkey } from "~/lib/hotKeys"
import { useNoteSection } from "~/hooks/useNoteSection"
import { buildPreviewPath } from "~/features/preview/lib/previewTypes"
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
  const navigate = useNavigate()
  const { id: eventId } = useParams()
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
        <div className="flex w-full min-w-0 items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Open preview workspace"
            disabled={!eventId}
            onClick={() => {
              if (!eventId) return
              navigate(buildPreviewPath(eventId))
            }}
            className="shrink-0 text-stone-300 hover:text-stone-100"
          >
            <FileText className="h-5 w-5" />
          </Button>
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
          searchInputRef={searchInputRef}
          onSearchQueryChange={setSearchQuery}
        />
      </Panel.Content>
    </>
  )
}

export default EventDetailPanelOrchestrator
