import { isValidEventDateRange } from "~/lib/events/eventDateRange"

export function isEventFormValid(values: {
  title: string
  startDateTime: string | null
  endDateTime: string | null
}): boolean {
  return (
    values.title.trim().length > 0 &&
    isValidEventDateRange(values.startDateTime, values.endDateTime)
  )
}
