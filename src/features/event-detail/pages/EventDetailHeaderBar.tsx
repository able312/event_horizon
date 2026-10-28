import { Link, useLocation, useSearchParams } from "react-router"
import { ArrowLeft } from "lucide-react"

import { LastEditedBy } from "~/components/molecules/LastEditedBy"
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
        <LastEditedBy record={eventResource.event} className="min-w-0" />
      ) : null}
    </div>
  )
}

export default EventDetailHeaderBar
