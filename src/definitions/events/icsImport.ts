import type { Event } from "../database.js"

export type IcsImportRowStatus =
  | "valid"
  | "duplicate_calendar_id"
  | "invalid"
  | "skipped_past"
  | "skipped_recurring"

export type IcsInvalidReason =
  | "missing_uid"
  | "missing_title"
  | "missing_start"
  | "missing_end"
  | "end_before_start"
  | "unavailable_row"

export interface IcsImportWarningFlags {
  possibleDuplicateTitleDate: boolean
}

export interface IcsImportReviewRow {
  rowId: string
  uid: string | null
  title: string | null
  startDateTime: string | null
  endDateTime: string | null
  status: IcsImportRowStatus
  invalidReason: IcsInvalidReason | null
  isAllDay: boolean
  /** Notes to store on the imported event; set only on importable rows. */
  internalNotes: string | null
  warnings: IcsImportWarningFlags
}

export interface IcsImportReviewSummary {
  totalRows: number
  validCount: number
  duplicateCalendarIdCount: number
  skippedInvalidCount: number
  skippedPastCount: number
  skippedRecurringCount: number
  possibleDuplicateWarningsCount: number
}

/**
 * Rows parsed from an .ics file by the main process, before they are checked
 * against existing events. No row is a duplicate or carries warnings yet.
 */
export interface IcsImportParsedPayload {
  sourceFileName: string
  generatedAtIso: string
  rows: IcsImportReviewRow[]
}

export interface IcsImportReviewPayload extends IcsImportParsedPayload {
  summary: IcsImportReviewSummary
}

/** An event to create from an imported calendar row. */
export interface IcsImportEventInput {
  calendarId: string
  title: string
  startDateTime: string
  endDateTime: string
  internalNotes: string | null
}

export interface IcsImportInsertResult {
  inserted: Event[]
  /** Calendar ids skipped because an event already has them. */
  duplicateCalendarIds: string[]
}

export interface IcsImportCommitResult {
  importedCount: number
  skippedDuplicateCount: number
  skippedInvalidCount: number
  possibleDuplicateWarningsCount: number
  importedEvents: Array<Pick<Event, "id" | "title" | "startDateTime" | "endDateTime">>
  skippedInvalidRows: Array<{
    rowId: string
    title: string | null
    reason: IcsInvalidReason | "duplicate_calendar_id"
  }>
}
