import { useCallback } from "react"
import { CornerDownRight } from "lucide-react"

import { Button } from "~/components/atoms/button"
import { hasText } from "~/lib/utils"
import { toNotePreview } from "./itemNoteTabs"

interface ItemNoteFieldProps {
  note: string
  label: string
  placeholder: string
  isEditing: boolean
  /** Focus the textarea (cursor at the end) when it opens. */
  focusOnOpen: boolean
  onStartEdit: () => void
  onSave: (value: string) => void
}


export function ItemNoteExpandButton({ isEditing, onToggle }: { isEditing: boolean; onToggle: () => void }) {
  return (
    <Button
      variant="ghost"
      className="size-6 text-stone-400 hover:text-orange-500"
      onClick={onToggle}
      aria-label={isEditing ? "Collapse note" : "Expand note"}
    >
      <CornerDownRight size={4} />
    </Button>
  )
}

/** A note shown as a one-line preview, or as a textarea while editing. Saves on blur. */
export function ItemNoteField({ note, label, placeholder, isEditing, focusOnOpen, onStartEdit, onSave }: ItemNoteFieldProps) {
  // Runs once when the textarea mounts, so later clicks into the text keep their caret.
  const focusAtEnd = useCallback((textarea: HTMLTextAreaElement | null) => {
    if (!textarea || !focusOnOpen) return
    textarea.focus()
    textarea.setSelectionRange(textarea.value.length, textarea.value.length)
  }, [focusOnOpen])

  if (isEditing) {
    return (
      <textarea
        defaultValue={note}
        ref={focusAtEnd}
        onBlur={(e) => onSave(e.target.value)}
        aria-label={label}
        placeholder={placeholder}
        className="min-h-8 w-full rounded-xs border border-transparent bg-transparent px-1.5 py-1 text-sm text-stone-500 outline-none transition-colors focus:border-border focus:bg-background focus:text-foreground field-sizing-content"
      />
    )
  }

  const isEmpty = !hasText(note)
  return (
    <div
      className={`${isEmpty ? "text-stone-400" : "text-stone-500"} m-0.25 min-h-7.5 w-full px-1.5 py-1`}
      onClick={onStartEdit}
    >
      {isEmpty ? placeholder : toNotePreview(note)}
    </div>
  )
}
