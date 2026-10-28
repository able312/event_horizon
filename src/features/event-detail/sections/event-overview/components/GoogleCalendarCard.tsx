import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { CalendarDays, CalendarPlus, ExternalLink, MoreVertical, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { Button } from "~/components/atoms/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/atoms/dropdown-menu"
import { Input } from "~/components/atoms/input"
import type { Event, UpdateEvent } from "~/definitions/database"
import { googleCalendarQueries } from "~/lib/data/queries"
import type { GoogleCalendarSyncStatus } from "~/lib/googleCalendar"
import { cn } from "~/lib/utils"

import GoogleCalendarRemoveConfirmDialog from "~/features/event-detail/components/GoogleCalendarRemoveConfirmDialog"
import { useGoogleCalendarActions } from "../hooks/useGoogleCalendarActions"

const ACTION_BUTTON_CLASS = "h-7 rounded-xs px-2 text-sm"

type GoogleCalendarCardProps = {
  event: Pick<Event, "id" | "calendarId" | "startDateTime" | "endDateTime">
  onSaveCalendarId: (updates: UpdateEvent) => Promise<unknown>
}

type StatusTone = "ok" | "attention" | "neutral"

const STATUS_DOT_CLASS: Record<StatusTone, string> = {
  ok: "bg-emerald-500",
  attention: "bg-amber-500",
  neutral: "bg-stone-400",
}

// `syncStatus` is undefined while it loads; the card then shows Update as it would for an unknown state.
function cardStatus(isLinked: boolean, hasDates: boolean, syncStatus: GoogleCalendarSyncStatus | undefined): { text: string; tone: StatusTone } {
  if (!hasDates) return { text: `Set a start and end time to ${isLinked ? "update" : "add"} it`, tone: "attention" }
  if (!isLinked) return { text: "Not on the shared calendar yet", tone: "attention" }
  if (syncStatus === "synced") return { text: "Up to date on the shared calendar", tone: "ok" }
  if (syncStatus === "out_of_date") return { text: "Has changes not on Google Calendar yet", tone: "attention" }
  return { text: "On the shared calendar. Update to track changes", tone: "neutral" }
}

/**
 * The event's place on the shared Google Calendar.
 * Add/Update writes it from Convex (googleCalendar.pushEvent), which also saves the link.
 * Update stands out while the event has changes Google doesn't have, and moves to the menu
 * once Google is up to date (googleCalendar.getSyncStatus).
 * Linking pastes the ID or link of an event already in Google; Remove deletes the Google event and clears the link.
 */
export const GoogleCalendarCard: React.FC<GoogleCalendarCardProps> = ({ event, onSaveCalendarId }) => {
  const isLinked = Boolean(event.calendarId?.trim())
  const hasDates = Boolean(event.startDateTime && event.endDateTime) // pushing needs both start and end
  const actions = useGoogleCalendarActions(event.id, isLinked)
  const { data: syncStatus } = useQuery(googleCalendarQueries.syncStatus(event.id))
  const status = cardStatus(isLinked, hasDates, syncStatus)
  const isSynced = isLinked && syncStatus === "synced"
  const isOutOfDate = isLinked && syncStatus === "out_of_date"
  const [isEditingLink, setIsEditingLink] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)

  const confirmRemove = async () => {
    if (await actions.remove()) setShowRemoveConfirm(false)
  }

  return (
    <section
      aria-label="Google Calendar"
      className={cn(
        "flex items-center justify-between gap-x-3 gap-y-2 rounded-xs border px-3 py-2 shadow-sm",
        // One row, with the status truncating as the actions widen; only the link form takes its own row
        isEditingLink && "flex-wrap",
        isOutOfDate ? "border-amber-300 bg-amber-50" : "border-border bg-background",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <CalendarDays className="size-4 shrink-0 text-stone-500" aria-hidden="true" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-wide">Google Calendar</h3>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {/* Green when Google is up to date; amber while it needs adding or updating */}
            <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT_CLASS[status.tone])} />
            <span title={status.text} className={cn("truncate", isOutOfDate && "font-medium text-amber-800")}>
              {status.text}
            </span>
          </p>
        </div>
      </div>

      {isEditingLink ? (
        <GoogleCalendarLinkForm
          initialValue={event.calendarId ?? ""}
          onSave={async (calendarId) => {
            await onSaveCalendarId({ calendarId })
            setIsEditingLink(false)
          }}
          onCancel={() => setIsEditingLink(false)}
        />
      ) : (
        <div className="flex shrink-0 items-center gap-1">
          {isLinked ? (
            <>
              <Button
                type="button"
                variant="ghost"
                className={ACTION_BUTTON_CLASS}
                aria-label="Open in Google Calendar"
                disabled={actions.isBusy}
                onClick={() => void actions.open()}
              >
                <ExternalLink className="size-3.5" />
                {actions.isOpening ? "Opening…" : "Open"}
              </Button>
              {isSynced && !actions.isPushing ? null : (
                <Button
                  type="button"
                  variant={isOutOfDate ? "default" : "outline"}
                  className={cn(ACTION_BUTTON_CLASS, isOutOfDate && "bg-amber-500 text-white hover:bg-amber-600")}
                  aria-label="Update Google Calendar event"
                  disabled={!hasDates || actions.isBusy}
                  onClick={() => void actions.push()}
                >
                  <RefreshCw className={cn("size-3.5", actions.isPushing && "animate-spin")} />
                  {actions.isPushing ? "Updating…" : "Update"}
                </Button>
              )}
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              className={ACTION_BUTTON_CLASS}
              aria-label="Add to Google Calendar"
              disabled={!hasDates || actions.isBusy}
              onClick={() => void actions.push()}
            >
              <CalendarPlus className="size-3.5" />
              {actions.isPushing ? "Adding…" : "Add"}
            </Button>
          )}

          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 rounded-xs text-muted-foreground"
                aria-label="More Google Calendar actions"
                disabled={actions.isBusy}
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* Google edits aren't tracked, so an up-to-date event can still be sent again */}
              {isSynced ? (
                <DropdownMenuItem onClick={() => void actions.push()}>Update anyway</DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onClick={() => setIsEditingLink(true)}>
                {isLinked ? "Change linked event…" : "Link existing event…"}
              </DropdownMenuItem>
              {isLinked ? (
                <DropdownMenuItem variant="destructive" onClick={() => setShowRemoveConfirm(true)}>
                  Remove from Google Calendar
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <GoogleCalendarRemoveConfirmDialog
        open={showRemoveConfirm}
        isRemoving={actions.isRemoving}
        onCancel={() => setShowRemoveConfirm(false)}
        onConfirm={() => void confirmRemove()}
      />
    </section>
  )
}

type GoogleCalendarLinkFormProps = {
  initialValue: string
  onSave: (calendarId: string) => Promise<void>
  onCancel: () => void
}

// Pastes the ID or link of an event already on Google Calendar; wraps onto its own row in the card.
const GoogleCalendarLinkForm: React.FC<GoogleCalendarLinkFormProps> = ({ initialValue, onSave, onCancel }) => {
  const [draft, setDraft] = useState(initialValue)
  const [isSaving, setIsSaving] = useState(false)

  const save = async () => {
    const trimmed = draft.trim()
    if (trimmed.length === 0) {
      toast.error("Calendar ID is required")
      return
    }

    try {
      setIsSaving(true)
      await onSave(trimmed)
      toast.success("Linked to the Google Calendar event")
    } catch {
      toast.error("Failed to save the linked event")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form
      className="flex basis-full items-center gap-1.5"
      onSubmit={(e) => {
        e.preventDefault()
        void save()
      }}
    >
      <Input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => (e.key === "Escape" ? onCancel() : undefined)}
        placeholder="Paste Google Calendar event ID or link"
        aria-label="Google Calendar event ID or link"
        className="h-7 min-w-0 flex-1 rounded-xs text-sm"
      />
      <Button type="submit" className={ACTION_BUTTON_CLASS} disabled={isSaving}>
        Save
      </Button>
      <Button type="button" variant="ghost" className={ACTION_BUTTON_CLASS} onClick={onCancel} disabled={isSaving}>
        Cancel
      </Button>
    </form>
  )
}
