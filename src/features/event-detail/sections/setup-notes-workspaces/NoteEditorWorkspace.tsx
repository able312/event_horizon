import { useEffect, useMemo } from "react"
import { ArrowLeftRight, Trash2 } from "lucide-react"

import { Button } from "~/components/atoms/button"
import TimeblockHeader from "~/components/organisms/TimeblockHeader"
import DocumentStyleTextArea from "~/components/molecules/DocumentStyleTextarea"
import { SECTION_TYPE } from "~/definitions/timeblocks/timeblock-constants"
import type { UpdateTimeblock } from "~/definitions/database"
import type { TimeblockType } from "~/definitions/timeblocks/timeblocks-types"
import { useNoteSection } from "~/hooks/useNoteSection"
import { useSetupInstructionSection } from "~/hooks/useSetupInstrucionSection"
import { getSectionTypeLabel } from "~/features/event-detail/workspace/lib/navPolicy"

interface NoteEditorWorkspaceProps {
  timeblockId: string
  onDeleted: () => void
  onNotFound: () => void
}

function getEditorCopy(sectionType: TimeblockType) {
  if (sectionType === SECTION_TYPE.SETUP_INSTRUCTION) {
    return {
      sectionTitle: "Setup Instruction",
      titlePlaceholder: "e.g. Pavilion Setup, Buffet Setup",
      contentPlaceholder: "What does staff need to know?",
      toggleLabel: "Convert to Note",
      toggleTarget: SECTION_TYPE.NOTE as TimeblockType,
    }
  }

  return {
    sectionTitle: "Note",
    titlePlaceholder: "e.g. Client preferences, day-of reminders",
    contentPlaceholder: "Capture anything else about this event…",
    toggleLabel: "Convert to Setup Instruction",
    toggleTarget: SECTION_TYPE.SETUP_INSTRUCTION as TimeblockType,
  }
}

const NoteEditorWorkspace: React.FC<NoteEditorWorkspaceProps> = ({
  timeblockId,
  onDeleted,
  onNotFound,
}) => {
  const noteQuery = useNoteSection()
  const setupQuery = useSetupInstructionSection()

  const timeblock = useMemo(() => {
    const notes = noteQuery.data ?? []
    const setups = setupQuery.data ?? []
    return notes.find((row) => row.id === timeblockId) ?? setups.find((row) => row.id === timeblockId) ?? null
  }, [noteQuery.data, setupQuery.data, timeblockId])

  const isLoading = noteQuery.isLoading || setupQuery.isLoading
  const updateTimeblock = timeblock?.sectionType === SECTION_TYPE.SETUP_INSTRUCTION
    ? setupQuery.updateTimeblock
    : noteQuery.updateTimeblock
  const removeTimeblock = timeblock?.sectionType === SECTION_TYPE.SETUP_INSTRUCTION
    ? setupQuery.removeTimeblock
    : noteQuery.removeTimeblock

  useEffect(() => {
    if (isLoading) return
    if (!timeblock) {
      onNotFound()
    }
  }, [isLoading, onNotFound, timeblock])

  if (isLoading) {
    return (
      <div className="h-full min-h-0 overflow-y-auto bg-stone-100 p-4">
        <p className="text-sm text-muted-foreground">Loading note…</p>
      </div>
    )
  }

  if (!timeblock) {
    return (
      <div className="h-full min-h-0 overflow-y-auto bg-stone-100 p-4">
        <p className="text-sm text-muted-foreground">Note not found.</p>
      </div>
    )
  }

  const copy = getEditorCopy(timeblock.sectionType)

  const handleUpdate = (payload: { id: string; updates: UpdateTimeblock }) => {
    updateTimeblock(payload)
  }

  const handleToggleType = () => {
    updateTimeblock({
      id: timeblockId,
      updates: { sectionType: copy.toggleTarget },
    })
  }

  const handleDelete = () => {
    removeTimeblock(timeblockId, {
      onSuccess: () => {
        onDeleted()
      },
    })
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-stone-100 p-4">
      <div className="shadow-sm h-full flex flex-col min-h-0">
        <TimeblockHeader
          timeblockID={timeblockId}
          time={timeblock.time ?? ""}
          title={timeblock.title}
          sectionTitle={copy.sectionTitle}
          assignedTo={timeblock.assignedTo ?? ""}
          titlePlaceholder={copy.titlePlaceholder}
          tail={
            <>
              <Button
                type="button"
                variant="darkSecondary"
                aria-label={copy.toggleLabel}
                title={copy.toggleLabel}
                className="rounded-none h-full m-0 border-r border-stone-600 hover:bg-stone-600 hover:text-orange-400"
                onClick={handleToggleType}
              >
                <ArrowLeftRight className="h-4 w-4" />
                <span className="sr-only">{getSectionTypeLabel(timeblock.sectionType)}</span>
              </Button>
              <Button
                variant="darkSecondary"
                aria-label={`Delete ${copy.sectionTitle.toLowerCase()}`}
                className="rounded-none rounded-tr-xs h-full m-0 hover:bg-stone-600 hover:text-red-600"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          }
          updateTimeblock={handleUpdate}
        />

        <div className="border border-stone-300 flex-1 min-h-0 bg-white">
          <DocumentStyleTextArea
            className="min-h-[calc(100vh-220px)]"
            placeholderText={copy.contentPlaceholder}
            content={timeblock.details ?? ""}
            updateContentSource={(content: string) =>
              handleUpdate({ id: timeblockId, updates: { details: content } })
            }
          />
        </div>
      </div>
    </div>
  )
}

export default NoteEditorWorkspace
