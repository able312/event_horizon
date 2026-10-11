import ICAL from "ical.js"

export type IcsTimeParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
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
