import { Plus } from "lucide-react"

import type { EventContactsPanelGroup, EventContactsPanelItem } from "~/definitions/contacts"

import { ROLE_LABELS } from "../lib/eventContactsPanel"
import { EventContactRow } from "./EventContactRow"

type EventContactGroupProps = {
  group: EventContactsPanelGroup
  eventTitle: string
  selectedIds: ReadonlySet<string>
  onToggleSelected: (eventContactId: string) => void
  onToggleGroup: (eventContactIds: string[]) => void
  onAdd: () => void
  onEdit: (item: EventContactsPanelItem) => void
  onSetPrimary: (item: EventContactsPanelItem) => void
  onRemove: (item: EventContactsPanelItem) => void
}

export const EventContactGroup: React.FC<EventContactGroupProps> = ({
  group,
  eventTitle,
  selectedIds,
  onToggleSelected,
  onToggleGroup,
  onAdd,
  onEdit,
  onSetPrimary,
  onRemove,
}) => {
  const labels = ROLE_LABELS[group.role]
  const ids = group.items.map((item) => item.eventContactId)
  const selectedCount = ids.filter((id) => selectedIds.has(id)).length
  const allSelected = ids.length > 0 && selectedCount === ids.length

  return (
    <section>
      <div className="group/heading flex items-center gap-2.5">
        {ids.length > 0 ? (
          <input
            type="checkbox"
            className="size-3.5 shrink-0 cursor-pointer accent-orange-500"
            aria-label={`Select all ${labels.plural.toLowerCase()}`}
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = selectedCount > 0 && !allSelected
            }}
            onChange={() => onToggleGroup(ids)}
          />
        ) : null}
        <h4 className="flex-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {labels.plural}
          <span className="normal-case tracking-normal text-muted-foreground/70"> · {ids.length}</span>
        </h4>
        <button
          type="button"
          className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground opacity-0 transition-opacity group-hover/heading:opacity-100 hover:text-orange-500 focus-visible:opacity-100"
          onClick={onAdd}
        >
          <Plus className="size-3" /> Add {labels.singular.toLowerCase()}
        </button>
      </div>

      {group.items.length === 0 ? (
        <button
          type="button"
          className="mt-1 w-full rounded-xs border border-dashed border-border py-2 text-xs text-muted-foreground transition-colors hover:border-orange-300 hover:text-orange-600"
          onClick={onAdd}
        >
          No {labels.plural.toLowerCase()} yet — add one
        </button>
      ) : (
        <ul className="divide-y divide-border">
          {group.items.map((item) => (
            <EventContactRow
              key={item.eventContactId}
              role={group.role}
              item={item}
              eventTitle={eventTitle}
              selected={selectedIds.has(item.eventContactId)}
              onToggleSelected={() => onToggleSelected(item.eventContactId)}
              onEdit={() => onEdit(item)}
              onSetPrimary={() => onSetPrimary(item)}
              onRemove={() => onRemove(item)}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
