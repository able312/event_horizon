import { Info, Trash2 } from "lucide-react"

import { Button } from "~/components/atoms/button"

type MenuRowActionsProps = {
  /** Used in the delete button's accessible name. */
  label: string
  hasNotes: boolean
  notesExpanded: boolean
  onToggleNotes: () => void
  onRemove: () => void
}

/** A saved-menu row's note toggle (orange when it has a note or is open) and delete button. */
export const MenuRowActions: React.FC<MenuRowActionsProps> = ({ label, hasNotes, notesExpanded, onToggleNotes, onRemove }) => (
  <div className="inline-flex items-center justify-end">
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onToggleNotes}
      aria-label={notesExpanded ? "Hide note" : "Show note"}
      aria-pressed={notesExpanded}
      className={`h-8 px-2 ${
        notesExpanded || hasNotes ? "text-orange-600 hover:text-orange-700" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Info />
    </Button>
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onRemove}
      aria-label={`Delete ${label}`}
      className="h-8 px-2 text-muted-foreground hover:text-destructive"
    >
      <Trash2 />
    </Button>
  </div>
)
