import { useState } from "react"
import { Link, useLocation, useSearchParams } from "react-router"
import { ArrowLeft, CalendarPlus, ChevronDown } from "lucide-react"
import { toast } from "sonner"

import { Button } from "~/components/atoms/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/atoms/dropdown-menu"
import { Input } from "~/components/atoms/input"
import { LastEditedBy } from "~/components/molecules/LastEditedBy"
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/atoms/tooltip"
import type { Event, UpdateEvent } from "~/definitions/database"
import { pushEventToGoogleCalendar, removeEventFromGoogleCalendar } from "~/lib/data/googleCalendar"
import { openExternalUrl } from "~/lib/ipc/system"
import {
  DEFAULT_EVENT_DETAIL_RETURN_TO,
  normalizeReturnTo,
} from "../workspace/lib/eventDetailRouteState"
import GoogleCalendarRemoveConfirmDialog from "../components/GoogleCalendarRemoveConfirmDialog"
import type { EventResource } from "../types"

const MISSING_DATES_MESSAGE = "Set both start and end date/time to add the event to Google Calendar."

// Orange accent so the not-yet-uploaded Create action stands out in the header.
const CREATE_BUTTON_ACCENT_CLASS = "bg-orange-500 text-white hover:bg-orange-400"

interface EventDetailHeaderBarProps {
  eventResource: EventResource
}

const EventDetailHeaderBar: React.FC<EventDetailHeaderBarProps> = ({ eventResource }) => {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const locationState =
    typeof location.state === "object" && location.state !== null
      ? (location.state as { returnTo?: unknown })
      : null

  // Resolve back-link destination: query param wins, then router state, then default list route.
  const returnToFromQuery = normalizeReturnTo(searchParams.get("returnTo")) // ?returnTo=...
  // location.state.returnTo from navigation
  const returnToFromState =
    typeof locationState?.returnTo === "string" && locationState.returnTo.length > 0
      ? locationState.returnTo
      : null

  const returnTo =
    returnToFromQuery !== DEFAULT_EVENT_DETAIL_RETURN_TO
      ? returnToFromQuery
      : returnToFromState ?? DEFAULT_EVENT_DETAIL_RETURN_TO

  return (
    <div className="flex items-center justify-between gap-3 px-0 py-2 w-full">
      <Link to={returnTo} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" />
        {returnTo.startsWith("/preview/")
          ? "Back to Print Preview"
          : returnTo.startsWith("/contacts/")
          ? "Back to Contact"
          : returnTo.startsWith("/contacts")
          ? "Back to Contacts"
          : new URL(returnTo, "https://event-horizon.local").searchParams.get("view") === "inbox"
          ? "Back to Inbox"
          : "Back to Events"}
      </Link>

      {!eventResource.isLoading && eventResource.event ? (
        <div className="flex min-w-0 items-center gap-3">
          <LastEditedBy record={eventResource.event} />
          <GoogleCalendarHeaderAction
            eventId={eventResource.event.id}
            event={eventResource.event}
            onSaveCalendarId={eventResource.updateEvent}
          />
        </div>
      ) : null}
    </div>
  )
}

type GoogleCalendarHeaderActionProps = {
  eventId: string
  event: Pick<Event, "calendarId" | "startDateTime" | "endDateTime">
  onSaveCalendarId: (updates: UpdateEvent) => Promise<unknown>
}

// Google Calendar integration for the event header.
// Add/Update writes the event to the shared Google Calendar from Convex (googleCalendar.pushEvent),
// which also saves the link. Link existing pastes the ID or link of an event already in Google.
// Remove deletes the Google event and clears the link (googleCalendar.removeEvent).
const GoogleCalendarHeaderAction: React.FC<GoogleCalendarHeaderActionProps> = ({
  eventId,
  event,
  onSaveCalendarId,
}) => {
  // UI mode flags
  const [showCalendarIdInput, setShowCalendarIdInput] = useState(false) // true when linking or editing the ID
  const [calendarIdDraft, setCalendarIdDraft] = useState(event.calendarId ?? "")
  const [isSavingCalendarId, setIsSavingCalendarId] = useState(false)
  const [isPushing, setIsPushing] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const hasCalendarId = Boolean(event.calendarId && event.calendarId.trim().length > 0) // event already linked to a Google Calendar event
  const canPushToCalendar = Boolean(event.startDateTime && event.endDateTime) // requires both start and end date/time

  // Creates or updates the shared calendar event; the saved link arrives through the live event query.
  const pushToGoogleCalendar = async () => {
    if (!canPushToCalendar || isPushing) return

    try {
      setIsPushing(true)
      const { eventUrl } = await pushEventToGoogleCalendar(eventId)
      toast.success(hasCalendarId ? "Google Calendar event updated" : "Added to Google Calendar", {
        action: {
          label: "Open",
          onClick: () => void openExternalUrl(eventUrl).catch(() => toast.error("Couldn't open Google Calendar")),
        },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update Google Calendar"
      toast.error(message)
    } finally {
      setIsPushing(false)
    }
  }

  // Persists pasted/edited ID to the event.
  const saveCalendarId = async () => {
    const trimmed = calendarIdDraft.trim()
    if (trimmed.length === 0) {
      toast.error("Calendar ID is required")
      return
    }

    try {
      setIsSavingCalendarId(true)
      await onSaveCalendarId({ calendarId: trimmed })
      toast.success("Calendar ID saved")
      setShowCalendarIdInput(false)
    } catch {
      toast.error("Failed to save calendar ID")
    } finally {
      setIsSavingCalendarId(false)
    }
  }

  // Deletes the Google event and clears the link; the cleared link arrives through the live event query.
  const removeFromGoogleCalendar = async () => {
    if (isRemoving) return

    try {
      setIsRemoving(true)
      const { deletedFromGoogle } = await removeEventFromGoogleCalendar(eventId)
      setCalendarIdDraft("")
      setShowRemoveConfirm(false)
      toast.success(
        deletedFromGoogle
          ? "Removed from Google Calendar"
          : "Unlinked. The Google event was already gone",
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to remove the Google Calendar event"
      toast.error(message)
    } finally {
      setIsRemoving(false)
    }
  }

  // Opens inline input pre-filled with current ID (empty when linking an existing event).
  const startEditingCalendarId = () => {
    setCalendarIdDraft(event.calendarId ?? "")
    setShowCalendarIdInput(true)
  }

  return (
    <div className="flex items-center gap-2">
      {/* Mode 1: Pasting or editing the Google Calendar event ID */}
      {showCalendarIdInput ? (
        <div className="flex items-center gap-2 no-drag">
          <Input
            value={calendarIdDraft}
            onChange={(e) => setCalendarIdDraft(e.target.value)}
            placeholder="Paste Google Calendar event ID or link"
            className="h-8 w-64"
          />
          <Button size="sm" onClick={() => void saveCalendarId()} disabled={isSavingCalendarId}>
            Save
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCalendarIdInput(false)}
            disabled={isSavingCalendarId}
          >
            Cancel
          </Button>
        </div>
      ) : hasCalendarId ? (
        /* Mode 2: Linked event — Update button + Edit/Unlink dropdown */
        <div className="flex items-center">
          <UpdateGoogleCalendarButton
            canUpdate={canPushToCalendar}
            isUpdating={isPushing}
            isDisabled={isRemoving}
            onUpdate={() => void pushToGoogleCalendar()}
          />
          {/* Split button: primary action (Update) + chevron menu (Edit/Unlink) */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                aria-label="Calendar ID actions"
                className="rounded-l-none border-l px-2"
                disabled={isPushing || isRemoving}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={startEditingCalendarId}>Edit Calendar ID</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => setShowRemoveConfirm(true)}>
                Remove from Google Calendar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <GoogleCalendarRemoveConfirmDialog
            open={showRemoveConfirm}
            isRemoving={isRemoving}
            onCancel={() => setShowRemoveConfirm(false)}
            onConfirm={() => void removeFromGoogleCalendar()}
          />
        </div>
      ) : (
        /* Mode 3: Unlinked — add to the shared calendar or link an existing Google event */
        <UnlinkedGoogleCalendarMenu
          canCreate={canPushToCalendar}
          isCreating={isPushing}
          onCreate={() => void pushToGoogleCalendar()}
          onLinkExisting={startEditingCalendarId}
        />
      )}
    </div>
  )
}

type UpdateGoogleCalendarButtonProps = {
  canUpdate: boolean
  isUpdating: boolean
  isDisabled: boolean
  onUpdate: () => void
}

// Primary half of the linked-event split button; explains itself via tooltip when dates are missing.
const UpdateGoogleCalendarButton: React.FC<UpdateGoogleCalendarButtonProps> = ({ canUpdate, isUpdating, isDisabled, onUpdate }) => {
  const button = (
    <Button
      variant="outline"
      size="sm"
      onClick={onUpdate}
      disabled={!canUpdate || isUpdating || isDisabled}
      className="rounded-r-none border-r-0"
      aria-label="Update Event in Google Calendar"
    >
      {isUpdating ? "Updating…" : "Update"}
    </Button>
  )

  if (canUpdate) return button

  return (
    /* Tooltip needs a focusable wrapper because disabled buttons don't receive pointer events */
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0}>{button}</span>
      </TooltipTrigger>
      <TooltipContent sideOffset={8}>{MISSING_DATES_MESSAGE}</TooltipContent>
    </Tooltip>
  )
}

type UnlinkedGoogleCalendarMenuProps = {
  canCreate: boolean
  isCreating: boolean
  onCreate: () => void
  onLinkExisting: () => void
}

// Entry point for an event with no linked Google Calendar event.
// Linking doesn't need dates, so only the Create option is gated on start/end being set.
const UnlinkedGoogleCalendarMenu: React.FC<UnlinkedGoogleCalendarMenuProps> = ({
  canCreate,
  isCreating,
  onCreate,
  onLinkExisting,
}) => (
  <DropdownMenu modal={false}>
    <DropdownMenuTrigger asChild>
      <Button size="sm" className={CREATE_BUTTON_ACCENT_CLASS} aria-label="Google Calendar options" disabled={isCreating}>
        <CalendarPlus />
        {isCreating ? "Adding…" : "Google Cal"}
        <ChevronDown className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onClick={onCreate} disabled={!canCreate} className="flex-col items-start gap-0">
        Add to Google Calendar
        {!canCreate ? (
          <span className="text-xs text-muted-foreground">{MISSING_DATES_MESSAGE}</span>
        ) : null}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={onLinkExisting}>Link existing event</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
)

export default EventDetailHeaderBar
