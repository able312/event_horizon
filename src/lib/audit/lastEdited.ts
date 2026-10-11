import type { AuditFields, UserSummary } from "~/definitions/database"

/**
 * Record timestamps come in two formats: events and timeblocks store Unix ms as a
 * string, everything else stores ISO datetimes. Returns null when unparseable.
 */
export function parseRecordTimestamp(value: string | null | undefined): Date | null {
  if (!value) return null
  const time = /^\d+$/.test(value) ? Number(value) : Date.parse(value)
  return Number.isFinite(time) ? new Date(time) : null
}

export function userDisplayName(userId: string, users: readonly UserSummary[]): string {
  const user = users.find((candidate) => candidate.id === userId)
  if (!user) return "Unknown user"
  return user.name?.trim() || user.email
}

export type LastEdit = { editor: string; at: Date | null }

/** Who last edited a record and when; null when the record has no known editor (e.g. imported). */
export function describeLastEdit(
  record: AuditFields & { updatedAt?: string | null; createdAt?: string },
  users: readonly UserSummary[],
): LastEdit | null {
  if (!record.updatedBy) return null
  return {
    editor: userDisplayName(record.updatedBy, users),
    at: parseRecordTimestamp(record.updatedAt) ?? parseRecordTimestamp(record.createdAt),
  }
}

export function formatLastEdit({ editor, at }: LastEdit): string {
  if (!at) return `Last edited by ${editor}`
  const when = at.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
  return `Last edited by ${editor} · ${when}`
}
