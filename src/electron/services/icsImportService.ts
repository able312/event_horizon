import fs from "node:fs/promises"
import path from "node:path"
import ICAL from "ical.js"
import type {
  IcsImportParsedPayload,
  IcsImportReviewRow,
} from "../../definitions/events/icsImport.js"
import { getTodayLocalDateKey, toLocalDateKeyFromIso } from "../../lib/events/icsImportReview.js"
import {
  parseIcalTimeParts,
  toIsoEndOfDay,
  toIsoFromLocalParts,
  toIsoStartOfDay,
} from "./icsTime.js"

const IMPORT_DESCRIPTION_PREFIX = "Imported from Google Calendar:\n\n"

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

/**
 * Reads an .ics file into review rows. Only checks the file itself; duplicate
 * checks against existing events happen in the renderer's data layer.
 */
export async function parseIcsImportFile(filePath: string): Promise<IcsImportParsedPayload> {
  const rawIcs = await fs.readFile(filePath, "utf8")
  const parsed = ICAL.parse(rawIcs)
  const calendar = new ICAL.Component(parsed)
  const vevents = calendar.getAllSubcomponents("vevent")

  const todayDateKey = getTodayLocalDateKey()

  const reviewRows: IcsImportReviewRow[] = []

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
        internalNotes: null,
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
        internalNotes: null,
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
        internalNotes: null,
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
        internalNotes: null,
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
        internalNotes: null,
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
        internalNotes: null,
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
        internalNotes: null,
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
        internalNotes: null,
        warnings: {
          possibleDuplicateTitleDate: false,
        },
      })
      return
    }

    reviewRows.push({
      rowId,
      uid: ensuredUid,
      title: ensuredTitle,
      startDateTime,
      endDateTime,
      status: "valid",
      invalidReason: null,
      isAllDay,
      internalNotes: toInternalNotes(description),
      warnings: {
        possibleDuplicateTitleDate: false,
      },
    })
  })

  return {
    sourceFileName: path.basename(filePath),
    generatedAtIso: new Date().toISOString(),
    rows: reviewRows,
  }
}
