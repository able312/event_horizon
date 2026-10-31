import { CalendarOff } from "lucide-react"

import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/atoms/tooltip"
import { cn } from "~/lib/utils"

interface UndatedEventsButtonProps {
  /** Whether the search is currently limited to undated events */
  isActive: boolean
  /** Events with no date; hidden while unknown */
  count: number | undefined
  onToggle: () => void
}

/** Calendar header shortcut that lists events with no date in the search panel. */
function UndatedEventsButton({ isActive, count, onToggle }: UndatedEventsButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={isActive}
          aria-label={count === undefined ? "Events with no date" : `Events with no date (${count})`}
          className={cn(
            "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md border px-2 text-sm transition-colors",
            isActive
              ? "border-orange-500 bg-orange-500 text-white hover:bg-orange-400"
              : "border-border hover:bg-stone-100",
          )}
        >
          <CalendarOff className="size-4" aria-hidden="true" />
          No date
          {count !== undefined ? (
            <span aria-hidden="true" className="text-xs font-semibold tabular-nums">
              {count > 99 ? "99+" : count}
            </span>
          ) : null}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6}>
        {isActive ? "Stop showing only events with no date" : "Show events with no date"}
      </TooltipContent>
    </Tooltip>
  )
}

export default UndatedEventsButton
