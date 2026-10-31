import * as React from "react"
import { CalendarIcon, X } from "lucide-react"
import { Button } from "~/components/atoms/button"
import { Calendar } from "~/components/atoms/calendar"
import { Input } from "~/components/atoms/input"
import { cn } from "~/lib/utils"
import { parseTypedDate } from "./datePicker.lib"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/atoms/popover"

function formatDate(date: Date | null | undefined) {
  if (!date) return ""
  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function isBeforeMinDate(date: Date, minDate: Date | undefined): boolean {
  if (!minDate) return false
  return startOfDay(date).getTime() < startOfDay(minDate).getTime()
}

type DatePickerProps = {
  name?: string
  value: Date | null
  onChange?: (date: Date | null) => void
  inputClassName?: string
  minDate?: Date
  placeholder?: string
}

export function DatePicker({
  name,
  value,
  onChange,
  inputClassName,
  minDate,
  placeholder = "Pick a date",
}: DatePickerProps) {
  const generatedId = React.useId()
  const inputId = `${generatedId}-input`
  const buttonId = `${generatedId}-button`

  const [open, setOpen] = React.useState(false)
  const [month, setMonth] = React.useState<Date | undefined>(value ?? undefined)
  const [textValue, setTextValue] = React.useState(formatDate(value))
  const valueTime = value?.getTime() ?? null

  React.useEffect(() => {
    setTextValue(formatDate(value))
    if (value) setMonth(value)
    // Sync from the parent-controlled timestamp, not Date identity
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueTime])

  const emitChange = (next: Date | null) => {
    onChange?.(next)
  }

  const handleSelect = (date: Date | undefined) => {
    if (!date) {
      emitChange(null)
      setOpen(false)
      return
    }
    if (isBeforeMinDate(date, minDate)) return
    emitChange(date)
    setOpen(false)
  }

  // Typed text stays a draft until blur/Enter: partial input like "2" parses
  // as a real date, and emitting it would rewrite the text mid-typing
  const commitTypedText = () => {
    if (textValue.trim() === "") return

    const parsed = parseTypedDate(textValue)
    if (!parsed || isBeforeMinDate(parsed, minDate)) {
      setTextValue(formatDate(value))
      return
    }

    setMonth(parsed)
    setTextValue(formatDate(parsed))
    if (!value || startOfDay(parsed).getTime() !== startOfDay(value).getTime()) {
      emitChange(parsed)
    }
  }

  const handleClear = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setTextValue("")
    emitChange(null)
  }

  return (
    <div className="relative flex gap-2">
      {name && (
        <Input type="hidden" name={name} value={value ? value.toISOString() : ""} />
      )}
      <Input
        id={inputId}
        value={textValue}
        placeholder={placeholder}
        className={cn("bg-background pr-14", inputClassName)}
        onChange={(e) => {
          const raw = e.target.value
          setTextValue(raw)

          if (raw.trim() === "") emitChange(null)
        }}
        onBlur={commitTypedText}
        onKeyDown={(e) => {
          if (e.key === "Enter" && textValue !== formatDate(value)) {
            // Commit the draft first so a surrounding form can't submit the stale date
            e.preventDefault()
            commitTypedText()
            return
          }
          if (e.key === "ArrowDown") {
            e.preventDefault()
            setOpen(true)
          }
        }}
      />
      {value ? (
        <Button
          type="button"
          variant="ghost"
          className="absolute top-1/2 right-8 size-6 -translate-y-1/2"
          onClick={handleClear}
          aria-label="Clear date"
        >
          <X className="size-3.5" />
        </Button>
      ) : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={buttonId}
            type="button"
            variant="ghost"
            className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
          >
            <CalendarIcon className="size-3.5" />
            <span className="sr-only">Select date</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto overflow-hidden p-0"
          align="end"
          alignOffset={-8}
          sideOffset={10}
        >
          <Calendar
            mode="single"
            selected={value ?? undefined}
            captionLayout="dropdown"
            month={month}
            onMonthChange={setMonth}
            disabled={minDate ? { before: startOfDay(minDate) } : undefined}
            onSelect={handleSelect}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
