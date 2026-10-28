import { useState } from "react"
import { CalendarDays, CalendarPlus, ExternalLink, MoreHorizontal, RefreshCw } from "lucide-react"
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
import { cn } from "~/lib/utils"

import GoogleCalendarRemoveConfirmDialog from "~/features/event-detail/components/GoogleCalendarRemoveConfirmDialog"
import { useGoogleCalendarActions } from "../hooks/useGoogleCalendarActions"

const ACTION_BUTTON_CLASS = "h-7 rounded-xs px-2 text-sm"

type GoogleCalendarCardProps = {
  event: Pick<Event, "id" | "calendarId" | "startDateTime" | "endDateTime">
  onSaveCalendarId: (updates: UpdateEvent) => Promise<unknown>
}

function statusText(isLinked: boolean, hasDates: boolean): string {
  if (!hasDates) return `Set a start and end time to ${isLinked ? "update" : "add"} it`
  return isLinked ? "On the shared calendar" : "Not on the shared calendar yet"
}

/**
 * The event's place on the shared Google Calendar.
 * Add/Update writes it from Convex (googleCalendar.pushEvent), which also saves the link.
 * Linking pastes the ID or link of an event already in Google; Remove deletes the Google event and clears the link.
 */
export const GoogleCalendarCard: React.FC<GoogleCalendarCardProps> = ({ event, onSaveCalendarId }) => {
  const isLinked = Boolean(event.calendarId?.trim())
  const hasDates = Boolean(event.startDateTime && event.endDateTime) // pushing needs both start and end
  const actions = useGoogleCalendarActions(event.id, isLinked)
  const [isEditingLink, setIsEditingLink] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)

  const confirmRemove = async () => {
    if (await actions.remove()) setShowRemoveConfirm(false)
  }

  return (
    <section
      aria-label="Google Calendar"
      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xs border border-border bg-background px-3 py-2 shadow-sm"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <CalendarDays className="size-4 shrink-0 text-stone-500" aria-hidden="true" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-wide">Google Calendar</h3>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {/* Green once on the shared calendar; amber while it still needs adding */}
            <span
              aria-hidden="true"
              className={cn("size-1.5 shrink-0 rounded-full", isLinked ? "bg-emerald-500" : "bg-amber-500")}
            />
            <span className="truncate">{statusText(isLinked, hasDates)}</span>
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
              <Button
                type="button"
                variant="outline"
                className={ACTION_BUTTON_CLASS}
                aria-label="Update Google Calendar event"
                disabled={!hasDates || actions.isBusy}
                onClick={() => void actions.push()}
              >
                <RefreshCw className={cn("size-3.5", actions.isPushing && "animate-spin")} />
                {actions.isPushing ? "Updating…" : "Update"}
              </Button>
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
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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
