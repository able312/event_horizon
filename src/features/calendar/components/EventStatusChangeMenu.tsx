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
import { cn } from "~/lib/utils"

type EventStatusChangeMenuProps = {
  status: EventStatus
  onStatusChange: (status: EventStatus) => void
}

/** "Change status" button that opens the list of statuses. */
function EventStatusChangeMenu({ status, onStatusChange }: EventStatusChangeMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Change status
          <ChevronDown aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {ITER_EVENT_STATUSES.map((option) => {
          const { Icon, className } = EVENT_STATUS_ICONS[option]
          return (
            <DropdownMenuItem
              key={option}
              disabled={option === status}
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
