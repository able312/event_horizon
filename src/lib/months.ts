const MONTH_PARAM_PATTERN = /^(\d{4})-(\d{1,2})$/

export type MonthParts = {
  year: number
  month: number
}

export type MonthRangeUtc = {
  normalizedMonth: string
  startInclusiveIso: string
  endExclusiveIso: string
}

export function getCurrentMonthParam(now: Date = new Date()): string {
  return toMonthParam(now.getFullYear(), now.getMonth() + 1)
}

export function normalizeMonthParam(value: unknown): string | null {
  if (typeof value !== "string") return null

  const trimmed = value.trim()
  const match = MONTH_PARAM_PATTERN.exec(trimmed)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  if (!Number.isInteger(year) || !Number.isInteger(month)) return null
  if (month < 1 || month > 12) return null

  return toMonthParam(year, month)
}

export function parseMonthParam(value: unknown): MonthParts | null {
  const normalized = normalizeMonthParam(value)
  if (!normalized) return null

  const [year, month] = normalized.split("-")
  return {
    year: Number(year),
    month: Number(month),
  }
}

export function shiftMonthParam(month: string, offset: number): string {
  const parts = parseMonthParam(month)
  const baseDate = parts
    ? new Date(parts.year, parts.month - 1, 1)
    : new Date()

  const shiftedDate = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth() + offset,
    1,
  )

  return getCurrentMonthParam(shiftedDate)
}

export function getMonthRangeUtcFromLocal(month: string): MonthRangeUtc | null {
  const parts = parseMonthParam(month)
  if (!parts) return null

  const startOfMonthLocal = new Date(parts.year, parts.month - 1, 1, 0, 0, 0, 0)
  const startOfNextMonthLocal = new Date(parts.year, parts.month, 1, 0, 0, 0, 0)

  return {
    normalizedMonth: toMonthParam(parts.year, parts.month),
    startInclusiveIso: startOfMonthLocal.toISOString(),
    endExclusiveIso: startOfNextMonthLocal.toISOString(),
  }
}

export function getMonthParamForDateTime(dateTime: string): string | null {
  const date = new Date(dateTime)
  if (Number.isNaN(date.getTime())) return null

  return getCurrentMonthParam(date)
}

export function toMonthStartDate(month: string, fallbackNow: Date = new Date()): Date {
  const parts = parseMonthParam(month)
  if (!parts) {
    return new Date(fallbackNow.getFullYear(), fallbackNow.getMonth(), 1)
  }

  return new Date(parts.year, parts.month - 1, 1)
}

export function formatMonthLabel(month: string, locale: string = "en-US"): string {
  const parts = parseMonthParam(month)
  if (!parts) return "Invalid Month"

  return new Date(parts.year, parts.month - 1, 1).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  })
}

export function toLocalDateStartIso(localDate: string): string | null {
  if (!localDate) return null
  const [year, month, day] = localDate.split("-").map(Number)
  if (!year || !month || !day) return null

  return new Date(year, month - 1, day, 0, 0, 0, 0).toISOString()
}

export function toLocalDateEndExclusiveIso(localDate: string): string | null {
  if (!localDate) return null
  const [year, month, day] = localDate.split("-").map(Number)
  if (!year || !month || !day) return null

  return new Date(year, month - 1, day + 1, 0, 0, 0, 0).toISOString()
}

function toMonthParam(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`
}
