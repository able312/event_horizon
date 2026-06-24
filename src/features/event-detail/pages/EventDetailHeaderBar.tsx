import { useState } from "react"
import { Link, useLocation, useSearchParams } from "react-router"
import { ArrowLeft, ChevronDown } from "lucide-react"
import { toast } from "sonner"

import { Button } from "~/components/atoms/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/atoms/dropdown-menu"
import { Input } from "~/components/atoms/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/atoms/tooltip"
import type { UpdateEvent } from "~/definitions/database"
import {
  buildGoogleCalendarCreateUrl,
  buildGoogleCalendarUpdateUrl,
  type GoogleCalendarEventInput,
} from "~/lib/googleCalendar"
import { openExternalUrl } from "~/lib/ipc/system"
import {
  DEFAULT_EVENT_DETAIL_RETURN_TO,
  normalizeReturnTo,
} from "../workspace/lib/eventDetailRouteState"
import type { EventResource } from "../types"

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

  const returnToFromQuery = normalizeReturnTo(searchParams.get("returnTo"))
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
        Back to Events
      </Link>

      {!eventResource.isLoading && eventResource.event ? (
        <GoogleCalendarHeaderAction
          event={eventResource.event}
          onSaveCalendarId={eventResource.updateEvent}
        />
      ) : null}
    </div>
  )
}

type GoogleCalendarHeaderActionProps = {
  event: GoogleCalendarEventInput
  onSaveCalendarId: (updates: UpdateEvent) => Promise<unknown>
}

const GoogleCalendarHeaderAction: React.FC<GoogleCalendarHeaderActionProps> = ({
  event,
  onSaveCalendarId,
}) => {
  const [showCalendarIdInput, setShowCalendarIdInput] = useState(false)
  const [calendarIdDraft, setCalendarIdDraft] = useState(event.calendarId ?? "")
  const [isSavingCalendarId, setIsSavingCalendarId] = useState(false)
  const hasCalendarId = Boolean(event.calendarId && event.calendarId.trim().length > 0)
  const canPushToCalendar = Boolean(event.startDateTime && event.endDateTime)

  const actionLabel = hasCalendarId ? "Update" : "Create"

  const openGoogleCalendar = async () => {
    if (!canPushToCalendar) return

    try {
      const url = hasCalendarId
        ? buildGoogleCalendarUpdateUrl(event)
        : buildGoogleCalendarCreateUrl(event)

      await openExternalUrl(url)
      if (!hasCalendarId) {
        setShowCalendarIdInput(true)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to open Google Calendar"
      toast.error(message)
    }
  }

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

  const startEditingCalendarId = () => {
    setCalendarIdDraft(event.calendarId ?? "")
    setShowCalendarIdInput(true)
  }

  return (
    <div className="flex items-center gap-2">
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
        </div>
      ) : hasCalendarId ? (
        <div className="flex items-center">
          {canPushToCalendar ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void openGoogleCalendar()}
              className="rounded-r-none border-r-0"
            >
              {actionLabel}
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>
                  <Button variant="outline" size="sm" disabled className="rounded-r-none border-r-0">
                    {actionLabel}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent sideOffset={8}>
                Set both start and end date/time to push to Google Calendar.
              </TooltipContent>
            </Tooltip>
          )}
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
      ) : canPushToCalendar ? (
        <Button variant="outline" size="sm" onClick={() => void openGoogleCalendar()}>
          {actionLabel}
        </Button>
      ) : null}

      {!hasCalendarId && !showCalendarIdInput && !canPushToCalendar ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>
              <Button variant="outline" size="sm" disabled>
                {actionLabel}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent sideOffset={8}>
            Set both start and end date/time to push to Google Calendar.
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  )
}

export default EventDetailHeaderBar
