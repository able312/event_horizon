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
import type { UpdateEvent } from "~/definitions/database"
import { selectPrimaryClient } from "~/features/contacts/lib/eventContactsPanel"
import {
  buildGoogleCalendarCreateUrl,
  buildGoogleCalendarUpdateUrl,
  type GoogleCalendarEventInput,
} from "~/lib/googleCalendar"
import { getEventContactsPanel } from "~/lib/data/eventContacts"
import { getIncompleteTouchpointsByEventId } from "~/lib/data/touchpoints"
import { openExternalUrl } from "~/lib/ipc/system"
import {
  DEFAULT_EVENT_DETAIL_RETURN_TO,
  normalizeReturnTo,
} from "../workspace/lib/eventDetailRouteState"
import type { EventResource } from "../types"

const MISSING_DATES_MESSAGE = "Set both start and end date/time to push to Google Calendar."

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
  event: GoogleCalendarEventInput
  onSaveCalendarId: (updates: UpdateEvent) => Promise<unknown>
}

// Google Calendar integration for the event header.
// Flow: Create opens Google Calendar pre-filled → user pastes returned event ID → future clicks Update.
// Alternatively, Link existing skips the browser and goes straight to pasting an existing event ID.
const GoogleCalendarHeaderAction: React.FC<GoogleCalendarHeaderActionProps> = ({
  eventId,
  event,
  onSaveCalendarId,
}) => {
  // UI mode flags
  const [showCalendarIdInput, setShowCalendarIdInput] = useState(false) // true after first Create, or when editing ID
  const [calendarIdDraft, setCalendarIdDraft] = useState(event.calendarId ?? "")
  const [isSavingCalendarId, setIsSavingCalendarId] = useState(false)
  const hasCalendarId = Boolean(event.calendarId && event.calendarId.trim().length > 0) // event already linked to a Google Calendar event
  const canPushToCalendar = Boolean(event.startDateTime && event.endDateTime) // requires both start and end date/time

  // Opens create or update URL; after create, prompts for ID paste.
  const openGoogleCalendar = async () => {
    if (!canPushToCalendar) return

    try {
      const [incomplete, contactsPanel] = await Promise.all([
        getIncompleteTouchpointsByEventId(eventId),
        getEventContactsPanel(eventId),
      ])
      const options = {
        incompleteTouchpoints: (incomplete ?? []).map((row) => ({
          title: row.title,
          dueDate: row.dueDate,
        })),
        client: selectPrimaryClient(contactsPanel),
      }
      const url = hasCalendarId
        ? buildGoogleCalendarUpdateUrl(event, options)
        : buildGoogleCalendarCreateUrl(event, options)

      await openExternalUrl(url)
      if (!hasCalendarId) {
        setShowCalendarIdInput(true)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to open Google Calendar"
      toast.error(message)
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

  // Clears link so user can create a new calendar event.
  const removeCalendarId = async () => {
    try {
      setIsSavingCalendarId(true)
      await onSaveCalendarId({ calendarId: null })
      setCalendarIdDraft("")
      setShowCalendarIdInput(false)
      toast.success("Calendar ID removed")
    } catch {
      toast.error("Failed to remove calendar ID")
    } finally {
      setIsSavingCalendarId(false)
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
            placeholder="Paste Google Calendar ID"
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
        /* Mode 2: Linked event — Update button + Edit/Remove dropdown */
        <div className="flex items-center">
          <UpdateGoogleCalendarButton canUpdate={canPushToCalendar} onUpdate={() => void openGoogleCalendar()} />
          {/* Split button: primary action (Update) + chevron menu (Edit/Remove ID) */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                aria-label="Calendar ID actions"
                className="rounded-l-none border-l px-2"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={startEditingCalendarId}>Edit Calendar ID</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => void removeCalendarId()}>
                Remove Calendar ID
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        /* Mode 3: Unlinked — choose between creating a new Google event or linking an existing one */
        <UnlinkedGoogleCalendarMenu
          canCreate={canPushToCalendar}
          onCreate={() => void openGoogleCalendar()}
          onLinkExisting={startEditingCalendarId}
        />
      )}
    </div>
  )
}

type UpdateGoogleCalendarButtonProps = {
  canUpdate: boolean
  onUpdate: () => void
}

// Primary half of the linked-event split button; explains itself via tooltip when dates are missing.
const UpdateGoogleCalendarButton: React.FC<UpdateGoogleCalendarButtonProps> = ({ canUpdate, onUpdate }) => {
  const button = (
    <Button
      variant="outline"
      size="sm"
      onClick={onUpdate}
      disabled={!canUpdate}
      className="rounded-r-none border-r-0"
      aria-label="Update Event in Google Calendar"
    >
      Update
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
  onCreate: () => void
  onLinkExisting: () => void
}

// Entry point for an event with no linked Google Calendar event.
// Linking doesn't need dates, so only the Create option is gated on start/end being set.
const UnlinkedGoogleCalendarMenu: React.FC<UnlinkedGoogleCalendarMenuProps> = ({
  canCreate,
  onCreate,
  onLinkExisting,
}) => (
  <DropdownMenu modal={false}>
    <DropdownMenuTrigger asChild>
      <Button size="sm" className={CREATE_BUTTON_ACCENT_CLASS} aria-label="Google Calendar options">
        <CalendarPlus />
        Google Cal
        <ChevronDown className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onClick={onCreate} disabled={!canCreate} className="flex-col items-start gap-0">
        Create new event
        {!canCreate ? (
          <span className="text-xs text-muted-foreground">{MISSING_DATES_MESSAGE}</span>
        ) : null}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={onLinkExisting}>Link existing event</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
)

export default EventDetailHeaderBar
