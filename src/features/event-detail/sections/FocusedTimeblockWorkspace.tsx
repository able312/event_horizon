import { useCallback, useEffect } from "react"

import RouteBlockingError from "~/components/atoms/route-blocking-error"
import { SECTION_TYPE } from "~/definitions/timeblocks/timeblock-constants"
import { isConvertibleTimeblockType } from "~/definitions/timeblocks/timeblock-conversion"
import { useFocusedTimeblock } from "~/hooks/useFocusedTimeblock"
import NoteEditorWorkspace from "~/features/event-detail/sections/setup-notes-workspaces/NoteEditorWorkspace"
import FoodEditorWorkspace from "~/features/event-detail/sections/food-beverage-workspaces/FoodEditorWorkspace"

interface FocusedTimeblockWorkspaceProps {
  timeblockId: string
  onDeleted: () => void
  onNotFound: () => void
}

const FocusedTimeblockWorkspace: React.FC<FocusedTimeblockWorkspaceProps> = ({
  timeblockId,
  onDeleted,
  onNotFound,
}) => {
  const query = useFocusedTimeblock(timeblockId)

  const handleRetry = useCallback(async () => {
    await query.refetch()
  }, [query])

  useEffect(() => {
    if (query.isLoading || query.isFetching) return
    if (query.error) return
    if (!query.data) {
      onNotFound()
    }
  }, [onNotFound, query.data, query.error, query.isFetching, query.isLoading])

  if (query.isLoading) {
    return (
      <div className="h-full min-h-0 overflow-y-auto bg-stone-100 p-4">
        <p className="text-sm text-muted-foreground">Loading timeblock…</p>
      </div>
    )
  }

  if (query.error) {
    return (
      <RouteBlockingError
        title="Could not load timeblock"
        description="This focused timeblock is temporarily unavailable. Please retry."
        onRetry={handleRetry}
        isRetrying={query.isFetching}
      />
    )
  }

  const timeblock = query.data
  if (!timeblock) {
    return (
      <div className="h-full min-h-0 overflow-y-auto bg-stone-100 p-4">
        <p className="text-sm text-muted-foreground">Timeblock not found.</p>
      </div>
    )
  }

  if (!isConvertibleTimeblockType(timeblock.sectionType)) {
    return (
      <div className="h-full min-h-0 overflow-y-auto bg-stone-100 p-4">
        <p className="text-sm text-muted-foreground">
          This timeblock type does not support a focused editor yet.
        </p>
      </div>
    )
  }

  if (timeblock.sectionType === SECTION_TYPE.FOOD) {
    return (
      <FoodEditorWorkspace
        key={`${timeblock.id}-food-${timeblock.updatedAt ?? "new"}`}
        timeblock={timeblock}
        onDeleted={onDeleted}
      />
    )
  }

  return (
    <NoteEditorWorkspace
      key={`${timeblock.id}-${timeblock.sectionType}-${timeblock.updatedAt ?? "new"}`}
      timeblockId={timeblock.id}
      timeblock={timeblock}
      onDeleted={onDeleted}
      onNotFound={onNotFound}
    />
  )
}

export default FocusedTimeblockWorkspace
