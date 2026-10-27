// No UI imports: the Google Calendar description built in Convex formats due dates with this.

/** Stored due dates are UTC-midnight ISO; map to a local calendar day for urgency. */
export function parseStoredDueDate(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return null
  return new Date(
    parsed.getUTCFullYear(),
    parsed.getUTCMonth(),
    parsed.getUTCDate(),
    12,
    0,
    0,
  )
}
