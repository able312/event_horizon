import { useRef, useState } from "react"
import { ChevronDown, Copy, Plus } from "lucide-react"
import { toast } from "sonner"
import { v4 as uuidv4 } from "uuid"

import { Button } from "~/components/atoms/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/atoms/dropdown-menu"
import { useTouchpointsSection } from "~/hooks/useTouchpointsSection"

import { formatTouchpointsPlainText } from "../lib/formatTouchpointsPlainText"
import type { TouchpointDraft } from "../types"
import { TouchpointRow } from "./TouchpointRow"

function draftHasPersistableContent(draft: TouchpointDraft): boolean {
  return draft.title.trim().length > 0 || Boolean(draft.dueDate)
}

export const TouchpointsCard: React.FC<{ eventId: string }> = ({ eventId }) => {
  const {
    data: touchpoints = [],
    isLoading,
    createTouchpointAsync,
    updateTouchpoint,
    deleteTouchpoint,
    seedCommonTouchpoints,
  } = useTouchpointsSection(eventId)

  const [drafts, setDrafts] = useState<TouchpointDraft[]>([])
  const savingDraftIds = useRef(new Set<string>())
  const draftsRef = useRef(drafts)
  draftsRef.current = drafts

  const persistDraft = async (
    clientId: string,
    override?: Partial<Pick<TouchpointDraft, "title" | "dueDate">>,
  ) => {
    const current = draftsRef.current.find((row) => row.clientId === clientId)
    if (!current) return
    const draft = override ? { ...current, ...override } : current
    if (!draftHasPersistableContent(draft)) return
    if (savingDraftIds.current.has(clientId)) return

    savingDraftIds.current.add(clientId)
    try {
      await createTouchpointAsync({
        title: draft.title.trim(),
        dueDate: draft.dueDate,
      })
      setDrafts((rows) => rows.filter((row) => row.clientId !== clientId))
    } finally {
      savingDraftIds.current.delete(clientId)
    }
  }

  const handleAddDraft = () => {
    setDrafts((current) => [
      ...current,
      {
        clientId: uuidv4(),
        title: "",
        dueDate: null,
        isDraft: true,
      },
    ])
  }

  const handleDraftChange = (
    clientId: string,
    patch: Partial<Pick<TouchpointDraft, "title" | "dueDate">>,
  ) => {
    setDrafts((current) => {
      const next = current.map((draft) =>
        draft.clientId === clientId ? { ...draft, ...patch } : draft,
      )
      draftsRef.current = next
      return next
    })
  }

  const handleCopy = async () => {
    const incomplete = touchpoints.filter((row) => !row.completedAt)
    const text = formatTouchpointsPlainText(
      incomplete.map((row) => ({ title: row.title, dueDate: row.dueDate })),
    )
    if (!text) {
      toast.error("No incomplete touchpoints to copy")
      return
    }

    try {
      await navigator.clipboard.writeText(text)
      toast.success("Touchpoints copied to clipboard")
    } catch {
      toast.error("Failed to copy touchpoints")
    }
  }

  return (
    <section className="rounded-xs border border-border bg-background p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-wide">Touchpoints</h3>
          <p className="text-xs text-muted-foreground">
            Key dates for this event. Mark complete when done.
          </p>
        </div>

        <div className="flex shrink-0 items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Copy incomplete touchpoints"
            onClick={() => void handleCopy()}
          >
            <Copy className="size-3.5" />
          </Button>

          <div className="flex items-stretch overflow-hidden rounded-xs border border-border">
            <Button
              type="button"
              variant="ghost"
              className="h-8 rounded-none border-r border-border px-2 text-sm"
              onClick={handleAddDraft}
            >
              <Plus className="size-3.5" />
              Add
            </Button>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-none"
                  aria-label="Touchpoint actions"
                >
                  <ChevronDown className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => seedCommonTouchpoints()}>
                  Seed common touchpoints
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {isLoading ? (
        <p className="py-3 text-xs text-muted-foreground">Loading touchpoints…</p>
      ) : (
        <ul className="mt-1 divide-y divide-border">
          {touchpoints.map((touchpoint) => (
            <TouchpointRow
              key={touchpoint.id}
              kind="persisted"
              touchpoint={touchpoint}
              onUpdateTitle={(title) =>
                updateTouchpoint({ id: touchpoint.id, updates: { title } })
              }
              onUpdateDueDate={(dueDate) =>
                updateTouchpoint({ id: touchpoint.id, updates: { dueDate } })
              }
              onToggleComplete={(completed) =>
                updateTouchpoint({
                  id: touchpoint.id,
                  updates: {
                    completedAt: completed ? new Date().toISOString() : null,
                  },
                })
              }
              onDelete={() => deleteTouchpoint(touchpoint.id)}
            />
          ))}
          {drafts.map((draft) => (
            <TouchpointRow
              key={draft.clientId}
              kind="draft"
              draft={draft}
              onChangeTitle={(title) => handleDraftChange(draft.clientId, { title })}
              onChangeDueDate={(dueDate) => {
                handleDraftChange(draft.clientId, { dueDate })
                void persistDraft(draft.clientId, { dueDate })
              }}
              onPersist={() => void persistDraft(draft.clientId)}
              onDiscard={() =>
                setDrafts((current) =>
                  current.filter((row) => row.clientId !== draft.clientId),
                )
              }
            />
          ))}
          {touchpoints.length === 0 && drafts.length === 0 ? (
            <li className="py-3 text-xs text-muted-foreground">
              No touchpoints yet. Add one, or seed the common set.
            </li>
          ) : null}
        </ul>
      )}
    </section>
  )
}
