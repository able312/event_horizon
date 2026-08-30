import { useEffect, useMemo, useRef, useState } from "react"
import { Trash2 } from "lucide-react"
import { useParams } from "react-router"

import { Button } from "~/components/atoms/button"
import TimeblockHeader from "~/components/organisms/TimeblockHeader"
import DocumentStyleTextArea from "~/components/molecules/DocumentStyleTextarea"
import { SECTION_TYPE } from "~/definitions/timeblocks/timeblock-constants"
import type { UpdateTimeblock } from "~/definitions/database"
import type { TimeblockType } from "~/definitions/timeblocks/timeblocks-types"
import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import { useNoteSection } from "~/hooks/useNoteSection"
import { useSetupInstructionSection } from "~/hooks/useSetupInstrucionSection"
import TimeblockTypeConvertControl from "./TimeblockTypeConvertControl"

interface NoteEditorWorkspaceProps {
  timeblockId: string
  timeblock?: TimeblockWithItems | null
  onDeleted: () => void
  onNotFound: () => void
}

function getEditorCopy(sectionType: TimeblockType) {
  if (sectionType === SECTION_TYPE.SETUP_INSTRUCTION) {
    return {
      sectionTitle: "Setup Instruction",
      titlePlaceholder: "e.g. Pavilion Setup, Buffet Setup",
      contentPlaceholder: "What does staff need to know?",
    }
  }

  return {
    sectionTitle: "Note",
    titlePlaceholder: "e.g. Client preferences, day-of reminders",
    contentPlaceholder: "Capture anything else about this event…",
  }
}

const NoteEditorWorkspace: React.FC<NoteEditorWorkspaceProps> = ({
  timeblockId,
  timeblock: providedTimeblock,
  onDeleted,
  onNotFound,
}) => {
  const { id: eventId } = useParams()
  const noteQuery = useNoteSection()
  const setupQuery = useSetupInstructionSection()
  const [draftDetails, setDraftDetails] = useState<string | null>(null)
  const draftDirtyRef = useRef(false)

  const timeblock = useMemo(() => {
    if (providedTimeblock) return providedTimeblock
    const notes = noteQuery.data ?? []
    const setups = setupQuery.data ?? []
    return notes.find((row) => row.id === timeblockId) ?? setups.find((row) => row.id === timeblockId) ?? null
  }, [noteQuery.data, providedTimeblock, setupQuery.data, timeblockId])

  const isLoading = providedTimeblock
    ? false
    : noteQuery.isLoading || setupQuery.isLoading
  const updateTimeblock = timeblock?.sectionType === SECTION_TYPE.SETUP_INSTRUCTION
    ? setupQuery.updateTimeblock
    : noteQuery.updateTimeblock
  const removeTimeblock = timeblock?.sectionType === SECTION_TYPE.SETUP_INSTRUCTION
    ? setupQuery.removeTimeblock
    : noteQuery.removeTimeblock
  const isMutating = timeblock?.sectionType === SECTION_TYPE.SETUP_INSTRUCTION
    ? Boolean(setupQuery.isMutating)
    : Boolean(noteQuery.isMutating)

  useEffect(() => {
    if (isLoading) return
    if (!timeblock) {
      onNotFound()
    }
  }, [isLoading, onNotFound, timeblock])

  useEffect(() => {
    draftDirtyRef.current = false
    setDraftDetails(null)
  }, [timeblockId, timeblock?.sectionType, timeblock?.updatedAt])

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
  const detailsValue = draftDetails ?? timeblock.details ?? ""

  const handleUpdate = (payload: { id: string; updates: UpdateTimeblock }) => {
    updateTimeblock(payload)
  }

  const flushDetailsIfDirty = () => {
    if (!draftDirtyRef.current || draftDetails === null) return
    draftDirtyRef.current = false
    handleUpdate({ id: timeblockId, updates: { details: draftDetails } })
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
              {eventId ? (
                <TimeblockTypeConvertControl
                  eventId={eventId}
                  timeblockId={timeblockId}
                  currentType={timeblock.sectionType}
                  disabled={isMutating}
                  onConverted={() => {
                    flushDetailsIfDirty()
                  }}
                />
              ) : null}
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
            key={`${timeblockId}-${timeblock.sectionType}-${timeblock.updatedAt ?? "new"}`}
            className="min-h-[calc(100vh-220px)]"
            placeholderText={copy.contentPlaceholder}
            content={detailsValue}
            updateContentSource={(content: string) => {
              draftDirtyRef.current = true
              setDraftDetails(content)
              handleUpdate({ id: timeblockId, updates: { details: content } })
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default NoteEditorWorkspace
