import { Trash2 } from "lucide-react"

import { Button } from "~/components/atoms/button"
import { Input } from "~/components/atoms/input"
import type { Touchpoint } from "~/definitions/database"
import {
  fromDateInputValue,
  toDateInputValue,
} from "~/features/event-detail/workspace/lib/financial"

import type { TouchpointDraft } from "../types"
import { getTouchpointUrgencyFromStored, URGENCY_STYLES } from "../lib/touchpointStatus"

type PersistedRowProps = {
  kind: "persisted"
  touchpoint: Touchpoint
  onUpdateTitle: (title: string) => void
  onUpdateDueDate: (dueDate: string | null) => void
  onToggleComplete: (completed: boolean) => void
  onDelete: () => void
}

type DraftRowProps = {
  kind: "draft"
  draft: TouchpointDraft
  onChangeTitle: (title: string) => void
  onChangeDueDate: (dueDate: string | null) => void
  onPersist: () => void
  onDiscard: () => void
}

type TouchpointRowProps = PersistedRowProps | DraftRowProps

function formatCompletedAt(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export const TouchpointRow: React.FC<TouchpointRowProps> = (props) => {
  if (props.kind === "draft") {
    return (
      <li className="group flex items-center gap-3 py-2.5">
        <input
          type="checkbox"
          disabled
          className="size-4 shrink-0 rounded border-border"
          aria-label="Complete touchpoint"
        />
        <div className="min-w-0 flex-1 space-y-1">
          <Input
            autoFocus
            value={props.draft.title}
            placeholder="Touchpoint title"
            className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            onChange={(event) => props.onChangeTitle(event.target.value)}
            onBlur={() => props.onPersist()}
          />
          <Input
            type="date"
            value={toDateInputValue(props.draft.dueDate)}
            className="h-7 max-w-[11rem] border-0 bg-transparent px-0 text-xs text-muted-foreground shadow-none focus-visible:ring-0"
            onChange={(event) => {
              const value = event.target.value
              props.onChangeDueDate(value ? fromDateInputValue(value) : null)
            }}
            onBlur={() => props.onPersist()}
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="Discard draft"
          onClick={props.onDiscard}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </li>
    )
  }

  const { touchpoint } = props
  const isComplete = Boolean(touchpoint.completedAt)
  const urgency = getTouchpointUrgencyFromStored(touchpoint.dueDate)
  const styles = urgency ? URGENCY_STYLES[urgency] : URGENCY_STYLES.standard

  return (
    <li className={isComplete ? "group flex items-center gap-3 py-2.5 opacity-70" : styles.rowClassName}>
      <input
        type="checkbox"
        checked={isComplete}
        className="size-4 shrink-0 rounded border-border accent-orange-500"
        aria-label={isComplete ? "Reopen touchpoint" : "Complete touchpoint"}
        onChange={(event) => props.onToggleComplete(event.target.checked)}
      />
      <div className="min-w-0 flex-1 space-y-0.5">
        <Input
          defaultValue={touchpoint.title}
          key={`${touchpoint.id}-title-${touchpoint.title}`}
          placeholder="Touchpoint title"
          className={`h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 ${
            isComplete
              ? "text-sm text-muted-foreground line-through"
              : styles.labelClassName
          }`}
          onBlur={(event) => {
            const next = event.target.value
            if (next !== touchpoint.title) props.onUpdateTitle(next)
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            defaultValue={toDateInputValue(touchpoint.dueDate)}
            key={`${touchpoint.id}-date-${touchpoint.dueDate ?? "none"}`}
            className="h-7 max-w-[11rem] border-0 bg-transparent px-0 text-xs text-muted-foreground shadow-none focus-visible:ring-0"
            onBlur={(event) => {
              const value = event.target.value
              const next = value ? fromDateInputValue(value) : null
              if (next !== touchpoint.dueDate) props.onUpdateDueDate(next)
            }}
          />
          {isComplete && touchpoint.completedAt ? (
            <span className="text-xs text-muted-foreground">
              Completed {formatCompletedAt(touchpoint.completedAt)}
            </span>
          ) : urgency && urgency !== "standard" && styles.badge ? (
            <span className={styles.badge.className}>{styles.badge.text}</span>
          ) : null}
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
        aria-label="Delete touchpoint"
        onClick={props.onDelete}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </li>
  )
}
