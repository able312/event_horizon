import { Check, Trash2 } from "lucide-react"

import { Button } from "~/components/atoms/button"
import { Input } from "~/components/atoms/input"
import type { Touchpoint } from "~/definitions/database"
import {
  fromDateInputValue,
  toDateInputValue,
} from "~/features/event-detail/workspace/lib/financial"

import type { TouchpointDraft } from "../types"
import { getTouchpointUrgencyFromStored, URGENCY_STYLES } from "../lib/touchpointStatus"

const COMPLETE_TOGGLE_CLASS =
  "inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-border bg-white text-orange-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 disabled:opacity-50"

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

const DATE_INPUT_CLASS =
  "h-8 w-[9.5rem] shrink-0 border-0 bg-transparent px-0 text-xs text-muted-foreground shadow-none focus-visible:ring-0"

function formatCompletedAt(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export const TouchpointRow: React.FC<TouchpointRowProps> = (props) => {
  if (props.kind === "draft") {
    return (
      <li className="group flex items-center gap-3 border-l-2 border-transparent py-2.5 pl-2">
        <button
          type="button"
          disabled
          className={COMPLETE_TOGGLE_CLASS}
          aria-label="Complete touchpoint"
          aria-checked={false}
          role="checkbox"
        />
        <Input
          autoFocus
          value={props.draft.title}
          placeholder="Touchpoint title"
          className="h-8 min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          onChange={(event) => props.onChangeTitle(event.target.value)}
          onBlur={() => props.onPersist()}
        />
        <Input
          type="date"
          value={toDateInputValue(props.draft.dueDate)}
          className={DATE_INPUT_CLASS}
          onChange={(event) => {
            const value = event.target.value
            props.onChangeDueDate(value ? fromDateInputValue(value) : null)
          }}
          onBlur={() => props.onPersist()}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
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
  const StatusIcon = styles.Icon

  return (
    <li
      className={
        isComplete
          ? "group flex items-center gap-3 border-l-2 border-transparent py-2.5 pl-2 opacity-70"
          : styles.rowClassName
      }
    >
      <button
        type="button"
        className={COMPLETE_TOGGLE_CLASS}
        aria-label={isComplete ? "Reopen touchpoint" : "Complete touchpoint"}
        aria-checked={isComplete}
        role="checkbox"
        onClick={() => props.onToggleComplete(!isComplete)}
      >
        {isComplete ? <Check className="size-3 stroke-[3]" aria-hidden /> : null}
      </button>
      <Input
        defaultValue={touchpoint.title}
        key={`${touchpoint.id}-title-${touchpoint.title}`}
        placeholder="Touchpoint title"
        className={`h-8 min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 ${
          isComplete
            ? "text-sm text-muted-foreground line-through"
            : styles.labelClassName
        }`}
        onBlur={(event) => {
          const next = event.target.value
          if (next !== touchpoint.title) props.onUpdateTitle(next)
        }}
      />
      <div className="flex shrink-0 items-center gap-2">
        <Input
          type="date"
          defaultValue={toDateInputValue(touchpoint.dueDate)}
          key={`${touchpoint.id}-date-${touchpoint.dueDate ?? "none"}`}
          className={DATE_INPUT_CLASS}
          onBlur={(event) => {
            const value = event.target.value
            const next = value ? fromDateInputValue(value) : null
            if (next !== touchpoint.dueDate) props.onUpdateDueDate(next)
          }}
        />
        {isComplete && touchpoint.completedAt ? (
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            Done {formatCompletedAt(touchpoint.completedAt)}
          </span>
        ) : urgency && urgency !== "standard" && styles.badge ? (
          <span className={`inline-flex items-center gap-1 ${styles.badge.className}`}>
            <StatusIcon className="size-3" aria-hidden />
            {styles.badge.text}
          </span>
        ) : null}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
        aria-label="Delete touchpoint"
        onClick={props.onDelete}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </li>
  )
}
