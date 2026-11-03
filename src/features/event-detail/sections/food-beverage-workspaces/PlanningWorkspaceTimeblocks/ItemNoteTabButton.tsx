import { hasNoteText } from "./itemNoteTabs"

interface ItemNoteTabButtonProps {
  label: string
  note: string
  active: boolean
  /** Colour of the dot that marks a tab with a note. */
  indicatorClassName: string
  onSelect: () => void
}

export function ItemNoteTabButton({ label, note, active, indicatorClassName, onSelect }: ItemNoteTabButtonProps) {
  const hasContent = hasNoteText(note)

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onSelect}
      className={`flex h-6 items-center gap-1 rounded-xs px-1.5 text-xs transition-colors ${
        active ? "bg-stone-100 font-medium text-foreground dark:bg-stone-800" : "text-stone-400 hover:text-stone-600"
      }`}
    >
      {label}
      {hasContent ? (
        <span aria-label="has a note" className={`size-1.5 rounded-full ${indicatorClassName}`} />
      ) : null}
    </button>
  )
}
