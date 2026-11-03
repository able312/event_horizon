import { ItemNoteExpandButton, ItemNoteField } from "./ItemNoteField"
import { useItemNoteEditing } from "./useItemNoteEditing"

interface PlanningTimeblockItemNoteRowProps {
  note: string
  onSave: (value: string) => void
}

/** A single item note (beverages). Food items use PlanningTimeblockItemNoteTabsRow. */
export function PlanningTimeblockItemNoteRow({ note, onSave }: PlanningTimeblockItemNoteRowProps) {
  const { isEditing, focusOnOpen, toggleEditing, startEditing } = useItemNoteEditing()

  return (
    <div className="flex items-start py-1">
      <ItemNoteExpandButton isEditing={isEditing} onToggle={toggleEditing} />
      <ItemNoteField
        note={note}
        label="Includes / Notes"
        placeholder="Notes..."
        isEditing={isEditing}
        focusOnOpen={focusOnOpen}
        onStartEdit={startEditing}
        onSave={(value) => {
          if (value !== note) onSave(value)
        }}
      />
    </div>
  )
}
