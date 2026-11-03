import { useState } from "react"

/**
 * Open/closed state for an item note. The arrow button opens the textarea without
 * focusing it; clicking the note (or "Add kitchen note…") opens it focused.
 */
export function useItemNoteEditing() {
  const [isEditing, setIsEditing] = useState(false)
  const [focusOnOpen, setFocusOnOpen] = useState(false)

  const toggleEditing = () => {
    setIsEditing((prev) => !prev)
    setFocusOnOpen(false)
  }

  const startEditing = () => {
    setIsEditing(true)
    setFocusOnOpen(true)
  }

  return { isEditing, focusOnOpen, toggleEditing, startEditing }
}
