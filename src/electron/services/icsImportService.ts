import fs from "node:fs/promises"
import path from "node:path"
import ICAL from "ical.js"
import type { NewEvent } from "../../definitions/database.js"
import type {
  IcsImportCommitRequest,
  IcsImportCommitResult,
  IcsImportReviewPayload,
  IcsImportReviewRow,
  IcsImportReviewSummary,
} from "../../definitions/events/icsImport.js"
import eventQueries from "../db/repository/events.js"
import {
  getTodayLocalDateKey,
  normalizeTitleForComparison,
  parseIcalTimeParts,
  toIsoEndOfDay,
  toIsoFromLocalParts,
  toIsoStartOfDay,
  toLocalDateKeyFromIso,
} from "./icsTime.js"

type ImportableRowRecord = {
  rowId: string
  uid: string
  title: string
  startDateTime: string
  endDateTime: string
  internalNotes: string | null
  warnings: {
    possibleDuplicateTitleDate: boolean
  }
}

type ImportSession = {
  payload: IcsImportReviewPayload
  importableRows: Map<string, ImportableRowRecord>
}

const IMPORT_DESCRIPTION_PREFIX = "Imported from Google Calendar:\n\n"
const sessions = new Map<string, ImportSession>()

function buildRowId(index: number): string {
  return `ics_row_${index}_${Math.random().toString(36).slice(2, 10)}`
}

function toTrimmedOrNull(value: string | null | undefined): string | null {
  if (!value) return null
  const normalized = value.trim()
  return normalized.length === 0 ? null : normalized
}

function hasRecurringProperties(component: InstanceType<typeof ICAL.Component>): boolean {
  return Boolean(
    component.getFirstProperty("rrule") ||
      component.getFirstProperty("rdate") ||
      component.getFirstProperty("exdate") ||
      component.getFirstProperty("recurrence-id"),
  )
}

function getEventDateTimes(
  component: InstanceType<typeof ICAL.Component>,
): {
  start: InstanceType<typeof ICAL.Time> | null
  end: InstanceType<typeof ICAL.Time> | null
} {
  const event = new ICAL.Event(component)

  return {
    start: event.startDate ?? null,
    end: event.endDate ?? null,
  }
}

function toInternalNotes(description: string | null): string | null {
  if (!description) return null
  return `${IMPORT_DESCRIPTION_PREFIX}${description}`
}

function compareDateKeys(a: string, b: string): number {
  if (a === b) return 0
  return a < b ? -1 : 1
}

function createSummary(rows: IcsImportReviewRow[]): IcsImportReviewSummary {
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

export async function prepareIcsImportReview(filePath: string): Promise<IcsImportReviewPayload> {
  const rawIcs = await fs.readFile(filePath, "utf8")
  const parsed = ICAL.parse(rawIcs)
  const calendar = new ICAL.Component(parsed)
  const vevents = calendar.getAllSubcomponents("vevent")

  const rawUids: string[] = []
  for (const component of vevents) {
    const event = new ICAL.Event(component)
    const uid = toTrimmedOrNull(event.uid)
    if (uid) rawUids.push(uid)
  }

  const existingByCalendarId = new Set(
    eventQueries
      .getByCalendarIds(rawUids)
      .map((event) => event.calendarId)
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0),
  )

  const existingTitleDateSet = new Set(
    eventQueries
      .getScheduled()
      .map((event) => {
        if (!event.startDateTime) return null
        const normalizedTitle = normalizeTitleForComparison(event.title)
        const dateKey = toLocalDateKeyFromIso(event.startDateTime)
        return `${normalizedTitle}|${dateKey}`
      })
      .filter((value): value is string => value !== null),
  )

  const todayDateKey = getTodayLocalDateKey()

  const reviewRows: IcsImportReviewRow[] = []
  const importableRows = new Map<string, ImportableRowRecord>()

  vevents.forEach((component, index) => {
    const event = new ICAL.Event(component)
    const uid = toTrimmedOrNull(event.uid)
    const title = toTrimmedOrNull(event.summary)
    const description = toTrimmedOrNull(event.description)
    const rowId = buildRowId(index)

    if (hasRecurringProperties(component)) {
      reviewRows.push({
        rowId,
        uid,
        title,
        startDateTime: null,
        endDateTime: null,
        status: "skipped_recurring",
        invalidReason: null,
        isAllDay: false,
        warnings: {
          possibleDuplicateTitleDate: false,
        },
      })
      return
    }

    const hasStartProperty = component.getFirstProperty("dtstart") !== null
    const hasEndProperty = component.getFirstProperty("dtend") !== null

    let startTime: InstanceType<typeof ICAL.Time> | null = null
    let endTime: InstanceType<typeof ICAL.Time> | null = null

    try {
      const dateTimes = getEventDateTimes(component)
      startTime = dateTimes.start
      endTime = dateTimes.end
    } catch {
      reviewRows.push({
        rowId,
        uid,
        title,
        startDateTime: null,
        endDateTime: null,
        status: "invalid",
        invalidReason: "missing_start",
        isAllDay: false,
        warnings: {
          possibleDuplicateTitleDate: false,
        },
      })
      return
    }

    if (!uid) {
      reviewRows.push({
        rowId,
        uid,
        title,
        startDateTime: null,
        endDateTime: null,
        status: "invalid",
        invalidReason: "missing_uid",
        isAllDay: false,
        warnings: {
          possibleDuplicateTitleDate: false,
        },
      })
      return
    }

    if (!title) {
      reviewRows.push({
        rowId,
        uid,
        title,
        startDateTime: null,
        endDateTime: null,
        status: "invalid",
        invalidReason: "missing_title",
        isAllDay: false,
        warnings: {
          possibleDuplicateTitleDate: false,
        },
      })
      return
    }

    if (!hasStartProperty || !startTime) {
      reviewRows.push({
        rowId,
        uid,
        title,
        startDateTime: null,
        endDateTime: null,
        status: "invalid",
        invalidReason: "missing_start",
        isAllDay: false,
        warnings: {
          possibleDuplicateTitleDate: false,
        },
      })
      return
    }

    if (!hasEndProperty || !endTime) {
      reviewRows.push({
        rowId,
        uid,
        title,
        startDateTime: null,
        endDateTime: null,
        status: "invalid",
        invalidReason: "missing_end",
        isAllDay: false,
        warnings: {
          possibleDuplicateTitleDate: false,
        },
      })
      return
    }

    const ensuredUid = uid
    const ensuredTitle = title
    const ensuredStartTime = startTime
    const ensuredEndTime = endTime

    const startParts = parseIcalTimeParts(ensuredStartTime)
    const isAllDay = ensuredStartTime.isDate

    const startDateTime = isAllDay
      ? toIsoStartOfDay(startParts)
      : toIsoFromLocalParts(startParts)
    const endDateTime = isAllDay
      ? toIsoEndOfDay(startParts)
      : toIsoFromLocalParts(parseIcalTimeParts(ensuredEndTime))

    if (new Date(endDateTime).getTime() < new Date(startDateTime).getTime()) {
      reviewRows.push({
        rowId,
        uid,
        title,
        startDateTime,
        endDateTime,
        status: "invalid",
        invalidReason: "end_before_start",
        isAllDay,
        warnings: {
          possibleDuplicateTitleDate: false,
        },
      })
      return
    }

    const startDateKey = toLocalDateKeyFromIso(startDateTime)
    if (compareDateKeys(startDateKey, todayDateKey) < 0) {
      reviewRows.push({
        rowId,
        uid,
        title,
        startDateTime,
        endDateTime,
        status: "skipped_past",
        invalidReason: null,
        isAllDay,
        warnings: {
          possibleDuplicateTitleDate: false,
        },
      })
      return
    }

    if (existingByCalendarId.has(ensuredUid)) {
      reviewRows.push({
        rowId,
        uid: ensuredUid,
        title: ensuredTitle,
        startDateTime,
        endDateTime,
        status: "duplicate_calendar_id",
        invalidReason: null,
        isAllDay,
        warnings: {
          possibleDuplicateTitleDate: false,
        },
      })
      return
    }

    const duplicateWarningKey = `${normalizeTitleForComparison(ensuredTitle)}|${startDateKey}`
    const possibleDuplicateTitleDate = existingTitleDateSet.has(duplicateWarningKey)

    reviewRows.push({
      rowId,
      uid: ensuredUid,
      title: ensuredTitle,
      startDateTime,
      endDateTime,
      status: "valid",
      invalidReason: null,
      isAllDay,
      warnings: {
        possibleDuplicateTitleDate,
      },
    })

    importableRows.set(rowId, {
      rowId,
      uid: ensuredUid,
      title: ensuredTitle,
      startDateTime,
      endDateTime,
      internalNotes: toInternalNotes(description),
      warnings: {
        possibleDuplicateTitleDate,
      },
    })
  })

  const payload: IcsImportReviewPayload = {
    sessionId: crypto.randomUUID(),
    sourceFileName: path.basename(filePath),
    generatedAtIso: new Date().toISOString(),
    rows: reviewRows,
    summary: createSummary(reviewRows),
  }

  sessions.set(payload.sessionId, {
    payload,
    importableRows,
  })

  return payload
}

export async function commitIcsImport(
  request: IcsImportCommitRequest,
): Promise<IcsImportCommitResult> {
  const session = sessions.get(request.sessionId)
  if (!session) {
    throw new Error("ICS import session expired or missing")
  }

  const selectedIds = Array.from(new Set(request.selectedRowIds))

  const selectedRecords: ImportableRowRecord[] = []
  const skippedInvalidRows: IcsImportCommitResult["skippedInvalidRows"] = []

  for (const selectedId of selectedIds) {
    const selectedRow = session.importableRows.get(selectedId)
    if (!selectedRow) {
      skippedInvalidRows.push({
        rowId: selectedId,
        title: null,
        reason: "unavailable_row",
      })
      continue
    }

    selectedRecords.push(selectedRow)
  }

  const duplicateCalendarIdSet = new Set(
    eventQueries
      .getByCalendarIds(selectedRecords.map((record) => record.uid))
      .map((event) => event.calendarId)
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0),
  )

  const rowsToInsert: NewEvent[] = []
  let skippedDuplicateCount = 0

  for (const selectedRecord of selectedRecords) {
    if (duplicateCalendarIdSet.has(selectedRecord.uid)) {
      skippedDuplicateCount += 1
      skippedInvalidRows.push({
        rowId: selectedRecord.rowId,
        title: selectedRecord.title,
        reason: "duplicate_calendar_id",
      })
      continue
    }

    rowsToInsert.push({
      title: selectedRecord.title,
      type: "function",
      status: "new_lead",
      startDateTime: selectedRecord.startDateTime,
      endDateTime: selectedRecord.endDateTime,
      calendarId: selectedRecord.uid,
      internalNotes: selectedRecord.internalNotes,
    } as NewEvent)
  }

  const insertedRows = eventQueries.insertMany(rowsToInsert)

  const baseInvalidCount =
    session.payload.summary.skippedInvalidCount +
    session.payload.summary.skippedPastCount +
    session.payload.summary.skippedRecurringCount

  const selectedWarningCount = selectedRecords.filter(
    (record) => record.warnings.possibleDuplicateTitleDate,
  ).length

  sessions.delete(request.sessionId)

  return {
    importedCount: insertedRows.length,
    skippedDuplicateCount,
    skippedInvalidCount: baseInvalidCount + (selectedIds.length - selectedRecords.length),
    possibleDuplicateWarningsCount: selectedWarningCount,
    importedEvents: insertedRows.map((event) => ({
      id: event.id,
      title: event.title,
      startDateTime: event.startDateTime,
      endDateTime: event.endDateTime,
    })),
    skippedInvalidRows,
  }
}
