import ICAL from "ical.js"

function pad(value: number): string {
  return String(value).padStart(2, "0")
}

export type IcsTimeParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

export function normalizeTitleForComparison(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase()
}

export function toLocalDateKeyFromIso(isoValue: string): string {
  const date = new Date(isoValue)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function getTodayLocalDateKey(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function parseIcalTimeParts(value: InstanceType<typeof ICAL.Time>): IcsTimeParts {
  return {
    year: value.year,
    month: value.month,
    day: value.day,
    hour: value.isDate ? 0 : value.hour,
    minute: value.isDate ? 0 : value.minute,
    second: value.isDate ? 0 : value.second,
  }
}

export function toIsoFromLocalParts(parts: IcsTimeParts): string {
  return new Date(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    0,
  ).toISOString()
}

export function toIsoStartOfDay(parts: Pick<IcsTimeParts, "year" | "month" | "day">): string {
  return toIsoFromLocalParts({ ...parts, hour: 0, minute: 0, second: 0 })
}

export function toIsoEndOfDay(parts: Pick<IcsTimeParts, "year" | "month" | "day">): string {
  return toIsoFromLocalParts({ ...parts, hour: 23, minute: 59, second: 0 })
}
