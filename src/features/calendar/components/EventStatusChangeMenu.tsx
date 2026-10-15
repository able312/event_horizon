import { ChevronDown } from "lucide-react"
import { Button } from "~/components/atoms/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/atoms/dropdown-menu"
import type { EventStatus } from "~/definitions/database"
import { ITER_EVENT_STATUSES } from "~/definitions/events/event-constants"
import { EVENT_STATUS_ICONS, EVENT_STATUS_LABELS } from "~/definitions/events/ui"
import { EVENT_STATUS_REQUIRES_DATE_ERROR, isStatusAllowedForDate } from "~/lib/events/eventStatusRules"
import { cn } from "~/lib/utils"

type EventStatusChangeMenuProps = {
  status: EventStatus
  startDateTime: string | null
  onStatusChange: (status: EventStatus) => void
}

/** "Change status" button that opens the list of statuses. */
function EventStatusChangeMenu({ status, startDateTime, onStatusChange }: EventStatusChangeMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Change status
          <ChevronDown aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {!startDateTime ? (
          <p className="max-w-52 px-2 py-1.5 text-xs text-muted-foreground">
            {EVENT_STATUS_REQUIRES_DATE_ERROR}.
          </p>
        ) : null}
        {ITER_EVENT_STATUSES.map((option) => {
          const { Icon, className } = EVENT_STATUS_ICONS[option]
          return (
            <DropdownMenuItem
              key={option}
              disabled={option === status || !isStatusAllowedForDate(option, startDateTime)}
              onSelect={() => onStatusChange(option)}
            >
              <Icon className={cn("size-3.5", className)} aria-hidden="true" />
              {EVENT_STATUS_LABELS[option]}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default EventStatusChangeMenu
