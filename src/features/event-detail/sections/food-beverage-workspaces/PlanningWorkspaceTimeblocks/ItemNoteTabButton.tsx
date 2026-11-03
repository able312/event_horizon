import { hasText } from "~/lib/utils"

interface ItemNoteTabButtonProps {
  id: string
  panelId: string
  label: string
  note: string
  active: boolean
  /** Colour of the dot that marks a tab with a note. */
  indicatorClassName: string
  /** Show the tab as a dim "add" prompt (an empty note that isn't open). */
  prompt?: boolean
  onSelect: () => void
}

export function ItemNoteTabButton({
  id,
  panelId,
  label,
  note,
  active,
  indicatorClassName,
  prompt = false,
  onSelect,
}: ItemNoteTabButtonProps) {
  const stateClassName = active
    ? "bg-stone-100 font-medium text-foreground dark:bg-stone-800"
    : prompt
      ? "text-stone-400/80 hover:text-orange-500"
      : "text-stone-400 hover:text-stone-600"

  return (
    <button
      type="button"
      role="tab"
      id={id}
      aria-selected={active}
      aria-controls={panelId}
      // Roving focus: Tab reaches the open tab; the arrow keys move between tabs.
      tabIndex={active ? 0 : -1}
      onClick={onSelect}
      className={`flex h-6 items-center gap-1 rounded-xs px-1.5 text-xs transition-colors ${stateClassName}`}
    >
      {label}
      {hasText(note) ? (
        <span aria-label="has a note" className={`size-1.5 rounded-full ${indicatorClassName}`} />
      ) : null}
    </button>
  )
}
