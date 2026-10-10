import type { Event } from "../../definitions/database.js"
import type {
  IcsImportCommitResult,
  IcsImportEventInput,
  IcsImportInsertResult,
  IcsImportReviewPayload,
  IcsImportReviewRow,
  IcsImportReviewSummary,
} from "../../definitions/events/icsImport.js"

const DAY_MS = 24 * 60 * 60 * 1000

function pad(value: number): string {
  return String(value).padStart(2, "0")
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

/** Events with the same normalized title on the same local day may be duplicates. */
export function toTitleDateKey(title: string, startDateTime: string): string {
  return `${normalizeTitleForComparison(title)}|${toLocalDateKeyFromIso(startDateTime)}`
}

export function createIcsImportSummary(rows: IcsImportReviewRow[]): IcsImportReviewSummary {
  const summary: IcsImportReviewSummary = {
    totalRows: rows.length,
    validCount: 0,
    duplicateCalendarIdCount: 0,
    skippedInvalidCount: 0,
    skippedPastCount: 0,
    skippedRecurringCount: 0,
    possibleDuplicateWarningsCount: 0,
  }

  for (const row of rows) {
    if (row.warnings.possibleDuplicateTitleDate) {
      summary.possibleDuplicateWarningsCount += 1
    }

    switch (row.status) {
      case "valid":
        summary.validCount += 1
        break
      case "duplicate_calendar_id":
        summary.duplicateCalendarIdCount += 1
        break
      case "invalid":
        summary.skippedInvalidCount += 1
        break
      case "skipped_past":
        summary.skippedPastCount += 1
        break
      case "skipped_recurring":
        summary.skippedRecurringCount += 1
        break
    }
  }

  return summary
}

/** The uids of every importable row, for the calendar-id duplicate check. */
export function getImportableUids(rows: IcsImportReviewRow[]): string[] {
  return rows
    .filter((row) => row.status === "valid" && row.uid)
    .map((row) => row.uid as string)
}

/**
 * The start range to load existing events from for the title/date check.
 * Padded by a day on each side so local-day comparisons see every candidate.
 */
export function getImportableStartRange(rows: IcsImportReviewRow[]): { startFrom: string; startTo: string } | null {
  const starts = rows
    .filter((row) => row.status === "valid" && row.startDateTime)
    .map((row) => Date.parse(row.startDateTime as string))
    .filter((value) => !Number.isNaN(value))

  if (starts.length === 0) return null

  return {
    startFrom: new Date(Math.min(...starts) - DAY_MS).toISOString(),
    startTo: new Date(Math.max(...starts) + DAY_MS).toISOString(),
  }
}

/**
 * Marks parsed rows whose uid already belongs to an event as duplicates, and flags
 * rows sharing a title and local day with an existing event as possible duplicates.
 */
export function buildIcsImportReview(
  parsedRows: IcsImportReviewRow[],
  existing: { calendarIds: Iterable<string>; scheduledEvents: Array<Pick<Event, "title" | "startDateTime">> },
): IcsImportReviewRow[] {
  const existingCalendarIds = new Set(existing.calendarIds)
  const existingTitleDateKeys = new Set(
    existing.scheduledEvents
      .filter((event) => event.startDateTime)
      .map((event) => toTitleDateKey(event.title, event.startDateTime as string)),
  )

  return parsedRows.map((row) => {
    if (row.status !== "valid" || !row.uid || !row.title || !row.startDateTime) return row

    if (existingCalendarIds.has(row.uid)) {
      return {
        ...row,
        status: "duplicate_calendar_id",
        internalNotes: null,
        warnings: { possibleDuplicateTitleDate: false },
      }
    }

    return {
      ...row,
      warnings: {
        possibleDuplicateTitleDate: existingTitleDateKeys.has(toTitleDateKey(row.title, row.startDateTime)),
      },
    }
  })
}

type SelectedImportRow = IcsImportReviewRow & IcsImportEventInput

function toSelectedImportRow(row: IcsImportReviewRow | undefined): SelectedImportRow | null {
  if (!row || row.status !== "valid") return null
  if (!row.uid || !row.title || !row.startDateTime || !row.endDateTime) return null

  return {
    ...row,
    calendarId: row.uid,
    title: row.title,
    startDateTime: row.startDateTime,
    endDateTime: row.endDateTime,
  }
}

/** Splits the user's selection into events to insert and ids that no longer match an importable row. */
export function selectIcsImportRows(review: IcsImportReviewPayload, selectedRowIds: string[]) {
  const rowsById = new Map(review.rows.map((row) => [row.rowId, row]))
  const selected: SelectedImportRow[] = []
  const unavailableRowIds: string[] = []

  for (const rowId of new Set(selectedRowIds)) {
    const row = toSelectedImportRow(rowsById.get(rowId))
    if (row) {
      selected.push(row)
    } else {
      unavailableRowIds.push(rowId)
    }
  }

  return { selected, unavailableRowIds }
}

export function toIcsImportEventInput(row: SelectedImportRow): IcsImportEventInput {
  return {
    calendarId: row.calendarId,
    title: row.title,
    startDateTime: row.startDateTime,
    endDateTime: row.endDateTime,
    internalNotes: row.internalNotes,
  }
}

/** Reports what an import did, counting rows skipped at review time and at insert time. */
export function buildIcsImportCommitResult(
  review: IcsImportReviewPayload,
  selection: ReturnType<typeof selectIcsImportRows>,
  insertResult: IcsImportInsertResult,
): IcsImportCommitResult {
  const duplicateCalendarIds = new Set(insertResult.duplicateCalendarIds)
  const skippedInvalidRows: IcsImportCommitResult["skippedInvalidRows"] = selection.unavailableRowIds.map((rowId) => ({
    rowId,
    title: null,
    reason: "unavailable_row",
  }))

  let skippedDuplicateCount = 0
  for (const row of selection.selected) {
    if (!duplicateCalendarIds.has(row.calendarId)) continue
    skippedDuplicateCount += 1
    skippedInvalidRows.push({ rowId: row.rowId, title: row.title, reason: "duplicate_calendar_id" })
  }

  const { summary } = review

  return {
    importedCount: insertResult.inserted.length,
    skippedDuplicateCount,
    skippedInvalidCount:
      summary.skippedInvalidCount +
      summary.skippedPastCount +
      summary.skippedRecurringCount +
      selection.unavailableRowIds.length,
    possibleDuplicateWarningsCount: selection.selected.filter((row) => row.warnings.possibleDuplicateTitleDate).length,
    importedEvents: insertResult.inserted.map((event) => ({
      id: event.id,
      title: event.title,
      startDateTime: event.startDateTime,
      endDateTime: event.endDateTime,
    })),
    skippedInvalidRows,
  }
}
