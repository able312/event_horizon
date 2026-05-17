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

export interface IcsImportReviewPayload {
  sessionId: string
  sourceFileName: string
  generatedAtIso: string
  rows: IcsImportReviewRow[]
  summary: IcsImportReviewSummary
}

export interface IcsImportCommitRequest {
  sessionId: string
  selectedRowIds: string[]
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
