import * as React from "react"
import { CalendarIcon } from "lucide-react"

import { Button } from "~/components/atoms/button"
import { Calendar } from "~/components/atoms/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/atoms/popover"
import { fromDateInputValue } from "~/features/event-detail/workspace/lib/financial"
import { cn } from "~/lib/utils"

import { parseStoredDueDate } from "../lib/touchpointStatus"

type TouchpointDueDatePickerProps = {
  dueDate: string | null
  eventStartDateTime: string | null
  onChange: (dueDate: string | null) => void
}

function formatDueLabel(dueDate: string | null): string {
  const parsed = parseStoredDueDate(dueDate)
  if (!parsed) return "no date"
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

/** Map a local calendar day to the UTC-midnight ISO used for stored due dates. */
function localDateToStoredIso(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return fromDateInputValue(`${year}-${month}-${day}`)
}

function parseEventLocalDay(iso: string | null): Date | undefined {
  if (!iso) return undefined
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return undefined
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0)
}

export function TouchpointDueDatePicker({
  dueDate,
  eventStartDateTime,
  onChange,
}: TouchpointDueDatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const selected = React.useMemo(
    () => parseStoredDueDate(dueDate) ?? undefined,
    [dueDate],
  )
  const eventDay = React.useMemo(
    () => parseEventLocalDay(eventStartDateTime),
    [eventStartDateTime],
  )
  const [month, setMonth] = React.useState<Date>(() => selected ?? eventDay ?? new Date())

  React.useEffect(() => {
    if (!open) return
    setMonth(selected ?? eventDay ?? new Date())
  }, [open, dueDate, eventStartDateTime, selected, eventDay])

  const label = formatDueLabel(dueDate)
  const isEmpty = !dueDate

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className={cn(
            "h-6 gap-1.5 px-1.5 text-xs font-normal",
            isEmpty ? "text-muted-foreground" : "text-stone-500",
          )}
          aria-label={isEmpty ? "Set due date" : `Due date ${label}`}
        >
          <CalendarIcon className="size-3.5 shrink-0" aria-hidden />
          <span>{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden p-0" align="start" sideOffset={6}>
        <Calendar
          mode="single"
          selected={selected}
          month={month}
          onMonthChange={setMonth}
          captionLayout="dropdown"
          modifiers={eventDay ? { eventDay } : undefined}
          modifiersClassNames={{
            eventDay:
              "relative after:absolute after:inset-1 after:rounded-md after:ring-2 after:ring-orange-400/80 after:ring-inset after:pointer-events-none",
          }}
          onSelect={(date) => {
            if (!date) return
            onChange(localDateToStoredIso(date))
            setOpen(false)
          }}
        />
        <div className="border-t border-border p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-full text-xs text-muted-foreground"
            disabled={isEmpty}
            onClick={() => {
              onChange(null)
              setOpen(false)
            }}
          >
            Clear date
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
