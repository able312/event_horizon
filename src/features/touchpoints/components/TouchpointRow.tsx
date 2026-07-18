import { Check, Trash2 } from "lucide-react"

import { Button } from "~/components/atoms/button"
import { Input } from "~/components/atoms/input"
import type { Touchpoint } from "~/definitions/database"

import type { TouchpointDraft } from "../types"
import { getTouchpointUrgencyFromStored, URGENCY_STYLES } from "../lib/touchpointStatus"
import { TouchpointDueDatePicker } from "./TouchpointDueDatePicker"

const COMPLETE_TOGGLE_CLASS =
  "inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-border bg-white text-orange-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 disabled:opacity-50"

/** Toggle (size-4) + gap-3 — keeps the bottom meta line aligned under the title. */
const TITLE_COLUMN_OFFSET = "pl-7"

const STATUS_SLOT_CLASS =
  "inline-flex h-5 w-[5.75rem] shrink-0 items-center justify-center gap-1 truncate"

const DONE_BADGE_CLASS =
  "rounded-xs bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"

const ROW_CHROME_STANDARD =
  "group flex flex-col gap-0.5 border-l-2 border-transparent py-2.5 pl-2"

const TITLE_INPUT_CLASS =
  "h-8 min-w-0 flex-1 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"

const DELETE_BUTTON_CLASS =
  "size-8 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"

type PersistedRowProps = {
  kind: "persisted"
  touchpoint: Touchpoint
  eventStartDateTime: string | null
  onUpdateTitle: (title: string) => void
  onUpdateDueDate: (dueDate: string | null) => void
  onToggleComplete: (completed: boolean) => void
  onDelete: () => void
}

type DraftRowProps = {
  kind: "draft"
  draft: TouchpointDraft
  eventStartDateTime: string | null
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

function StatusSlot({ children }: { children?: React.ReactNode }) {
  return <span className={STATUS_SLOT_CLASS}>{children}</span>
}

export const TouchpointRow: React.FC<TouchpointRowProps> = (props) => {
  if (props.kind === "draft") {
    return (
      <li className={ROW_CHROME_STANDARD}>
        <div className="flex items-center gap-3">
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
            className={TITLE_INPUT_CLASS}
            onChange={(event) => props.onChangeTitle(event.target.value)}
            onBlur={() => props.onPersist()}
          />
          <div className="flex shrink-0 items-center gap-1">
            <StatusSlot />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={DELETE_BUTTON_CLASS}
              aria-label="Discard draft"
              onClick={props.onDiscard}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 ${TITLE_COLUMN_OFFSET}`}>
          <TouchpointDueDatePicker
            dueDate={props.draft.dueDate}
            eventStartDateTime={props.eventStartDateTime}
            onChange={props.onChangeDueDate}
          />
        </div>
      </li>
    )
  }

  const { touchpoint } = props
  const isComplete = Boolean(touchpoint.completedAt)
  const urgency = getTouchpointUrgencyFromStored(touchpoint.dueDate)
  const styles = urgency ? URGENCY_STYLES[urgency] : URGENCY_STYLES.standard
  const StatusIcon = styles.Icon

  const statusContent = (() => {
    if (isComplete) {
      return <span className={DONE_BADGE_CLASS}>Done</span>
    }
    if (urgency && urgency !== "standard" && styles.badge) {
      return (
        <span className={`inline-flex max-w-full items-center gap-1 ${styles.badge.className}`}>
          <StatusIcon className="size-3 shrink-0" aria-hidden />
          <span className="truncate">{styles.badge.text}</span>
        </span>
      )
    }
    return null
  })()

  return (
    <li
      className={
        isComplete ? `${ROW_CHROME_STANDARD} opacity-70` : styles.rowClassName
      }
    >
      <div className="flex items-center gap-3">
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
          className={`${TITLE_INPUT_CLASS} ${
            isComplete
              ? "text-muted-foreground line-through"
              : styles.labelClassName
          }`}
          onBlur={(event) => {
            const next = event.target.value
            if (next !== touchpoint.title) props.onUpdateTitle(next)
          }}
        />
        <div className="flex shrink-0 items-center gap-1">
          <StatusSlot>{statusContent}</StatusSlot>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={DELETE_BUTTON_CLASS}
            aria-label="Delete touchpoint"
            onClick={props.onDelete}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
      <div className={`flex items-center gap-1.5 text-xs text-stone-500 ${TITLE_COLUMN_OFFSET}`}>
        <TouchpointDueDatePicker
          dueDate={touchpoint.dueDate}
          eventStartDateTime={props.eventStartDateTime}
          onChange={(next) => {
            if (next !== touchpoint.dueDate) props.onUpdateDueDate(next)
          }}
        />
        {isComplete && touchpoint.completedAt ? (
          <span className="whitespace-nowrap text-muted-foreground">
            · Done {formatCompletedAt(touchpoint.completedAt)}
          </span>
        ) : null}
      </div>
    </li>
  )
}
