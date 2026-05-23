import React from "react"
import { Plus } from "lucide-react"
import { useNoteSection } from "~/hooks/useNoteSection"
import DetailsTimeblock from "~/components/ui/DetailsTimeblock"
import type { UpdateTimeblock } from "~/definitions/database"

const NotesSection: React.FC = () => {
  const { data: notes, addNote, updateTimeblock, removeTimeblock } = useNoteSection()

  const handleUpdateTimeblock = (id: string, updates: UpdateTimeblock) => {
    updateTimeblock({id, updates})
  }
  const handleRemoveTimeblock = (id: string) => {
    removeTimeblock(id)
  }

  return (
    <div className="space-y-6">
      <div>
        
        { !notes || notes.length === 0 ? (
          <p className="text-muted-foreground text-sm">No notes added yet.</p>
        ) : (
          <div className="space-y-4">
            {notes.map((timeblock) => (
              <DetailsTimeblock
                key={timeblock.id}
                timeblock={timeblock}
                titlePlaceholder="Note Title"
                onEdit={handleUpdateTimeblock}
                onRemove={handleRemoveTimeblock}
              >

                <div className="mt-4">
                  <label className="text-xs text-muted-foreground">Note</label>
                  <textarea
                    defaultValue={timeblock.details ?? ""}
                    placeholder="Describe what needs to be done..."
                    className="w-full px-2 py-1 text-sm border rounded bg-white mt-1 resize-y"
                    onBlur={(e) => updateTimeblock({id: timeblock.id, updates: { details: e.target.value }})}
                    rows={timeblock.details?.split("\n").length ?? 2}
                  />
                </div>
              </DetailsTimeblock>
            ))}
          </div>
        )}
        
        <button
          onClick={() => addNote()}
          className="mt-2 text-sm text-primary hover:underline flex items-center gap-1"
        >
          <Plus size={14} /> Add Note
        </button>
      </div>
    </div>
  )
}

export default NotesSection
