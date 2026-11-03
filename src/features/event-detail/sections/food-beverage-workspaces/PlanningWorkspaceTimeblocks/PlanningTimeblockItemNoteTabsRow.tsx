import { useId, useState, type KeyboardEvent } from "react"

import { ITEM_NOTE_FIELDS, otherTabForKey, showsInternalNotePrompt, type ItemNoteTab } from "./itemNoteTabs"
import { ItemNoteExpandButton, ItemNoteField } from "./ItemNoteField"
import { ItemNoteTabButton } from "./ItemNoteTabButton"
import type { WorkspaceItemBase } from "./PlanningWorkspaceTimeblockList"
import { useItemNoteEditing } from "./useItemNoteEditing"

interface PlanningTimeblockItemNoteTabsRowProps<TItem extends WorkspaceItemBase> {
  clientNote: string
  internalNote: string
  timeblockID: string
  itemID: string
  updateItem: (payload: { timeblockId: string; itemId: string; updates: Partial<TItem> }) => void
}

const NOTE_COPY = {
  client: { label: "Client note", placeholder: "Notes..." },
  internal: { label: "Kitchen note", placeholder: "Kitchen notes..." },
} as const satisfies Record<ItemNoteTab, { label: string; placeholder: string }>

/** A food item's client and kitchen notes, one at a time behind a pair of tabs. */
export function PlanningTimeblockItemNoteTabsRow<TItem extends WorkspaceItemBase>({
  clientNote,
  internalNote,
  timeblockID,
  itemID,
  updateItem,
}: PlanningTimeblockItemNoteTabsRowProps<TItem>) {
  const [activeTab, setActiveTab] = useState<ItemNoteTab>("client")
  const { isEditing, focusOnOpen, toggleEditing, startEditing } = useItemNoteEditing()

  const notes: Record<ItemNoteTab, string> = { client: clientNote, internal: internalNote }
  const note = notes[activeTab]

  const idPrefix = useId()
  const tabId = (tab: ItemNoteTab) => `${idPrefix}-${tab}-tab`
  const panelId = `${idPrefix}-panel`
  const internalPrompt = showsInternalNotePrompt(internalNote, activeTab)

  // ARIA tabs pattern: the arrow keys (and Home/End) move between the two tabs.
  const handleTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = otherTabForKey(event.key, activeTab)
    if (!next) return
    event.preventDefault()
    setActiveTab(next)
    document.getElementById(tabId(next))?.focus()
  }

  const addInternalNote = () => {
    setActiveTab("internal")
    startEditing()
  }

  const saveNote = (value: string) => {
    if (value === note) return
    updateItem({
      timeblockId: timeblockID,
      itemId: itemID,
      updates: { [ITEM_NOTE_FIELDS[activeTab]]: value } as Partial<TItem>,
    })
  }

  return (
    <div className="flex items-start gap-1 py-1">
      <ItemNoteExpandButton isEditing={isEditing} onToggle={toggleEditing} />

      {/* Tabs sit above the note so every note starts at the same place and an open note gets the full width. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div role="tablist" aria-label="Item notes" onKeyDown={handleTabKeyDown} className="flex shrink-0 items-center gap-0.5 pt-0.5">
          <ItemNoteTabButton
            id={tabId("client")}
            panelId={panelId}
            label="Client"
            note={clientNote}
            active={activeTab === "client"}
            indicatorClassName="bg-sky-500"
            onSelect={() => setActiveTab("client")}
          />
          {/* Same element whether it's the prompt or the tab, so arrow-key focus stays on it. */}
          <ItemNoteTabButton
            id={tabId("internal")}
            panelId={panelId}
            label={internalPrompt ? "Add kitchen note…" : "Kitchen"}
            note={internalNote}
            active={activeTab === "internal"}
            indicatorClassName="bg-orange-500"
            prompt={internalPrompt}
            onSelect={internalPrompt ? addInternalNote : () => setActiveTab("internal")}
          />
        </div>

        <div role="tabpanel" id={panelId} aria-labelledby={tabId(activeTab)} className="min-w-0">
          <ItemNoteField
            // Remount per tab so the textarea's draft belongs to the note it was typed into.
            key={activeTab}
            note={note}
            label={NOTE_COPY[activeTab].label}
            placeholder={NOTE_COPY[activeTab].placeholder}
            isEditing={isEditing}
            focusOnOpen={focusOnOpen}
            onStartEdit={startEditing}
            onSave={saveNote}
          />
        </div>
      </div>
    </div>
  )
}
