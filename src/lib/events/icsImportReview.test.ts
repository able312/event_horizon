import { describe, expect, it } from "vitest"

import type { Event } from "../../definitions/database.js"
import type { IcsImportReviewPayload, IcsImportReviewRow } from "../../definitions/events/icsImport.js"
import {
  buildIcsImportCommitResult,
  buildIcsImportReview,
  createIcsImportSummary,
  getImportableStartRange,
  getImportableUids,
  selectIcsImportRows,
  toIcsImportEventInput,
} from "./icsImportReview.js"

function makeRow(overrides: Partial<IcsImportReviewRow> = {}): IcsImportReviewRow {
  return {
    rowId: "row-1",
    uid: "uid-1",
    title: "Summer Open",
    startDateTime: "2026-06-14T21:00:00.000Z",
    endDateTime: "2026-06-14T23:00:00.000Z",
    status: "valid",
    invalidReason: null,
    isAllDay: false,
    internalNotes: "Imported from Google Calendar:\n\nBring clubs",
    warnings: { possibleDuplicateTitleDate: false },
    ...overrides,
  }
}

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "event-1",
    title: "Existing Event",
    type: "function",
    status: "new_lead",
    startDateTime: null,
    endDateTime: null,
    minGuests: null,
    maxGuests: null,
    guestCountFinal: null,
    driveFolderId: null,
    calendarId: null,
    clientNotes: null,
    internalNotes: null,
    isInternal: 0,
    createdAt: "1",
    updatedAt: null,
    ...overrides,
  }
}

function makeReview(rows: IcsImportReviewRow[]): IcsImportReviewPayload {
  return {
    sourceFileName: "events.ics",
    generatedAtIso: "2026-06-01T12:00:00.000Z",
    rows,
    summary: createIcsImportSummary(rows),
  }
}

describe("getImportableUids / getImportableStartRange", () => {
  it("only considers valid rows, and pads the start range by a day", () => {
    const rows = [
      makeRow({ rowId: "a", uid: "uid-a", startDateTime: "2026-06-14T21:00:00.000Z" }),
      makeRow({ rowId: "b", uid: "uid-b", startDateTime: "2026-06-20T21:00:00.000Z" }),
      makeRow({ rowId: "c", uid: "uid-c", status: "skipped_past", startDateTime: "2025-01-01T00:00:00.000Z" }),
    ]

    expect(getImportableUids(rows)).toEqual(["uid-a", "uid-b"])
    expect(getImportableStartRange(rows)).toEqual({
      startFrom: "2026-06-13T21:00:00.000Z",
      startTo: "2026-06-21T21:00:00.000Z",
    })
  })

  it("returns no range when nothing is importable", () => {
    expect(getImportableStartRange([makeRow({ status: "invalid" })])).toBeNull()
  })
})

describe("buildIcsImportReview", () => {
  it("marks rows whose uid already belongs to an event as duplicates", () => {
    const rows = buildIcsImportReview([makeRow({ uid: "dup-1" })], {
      calendarIds: ["dup-1"],
      scheduledEvents: [],
    })

    expect(rows[0]?.status).toBe("duplicate_calendar_id")
    expect(rows[0]?.internalNotes).toBeNull()
    expect(createIcsImportSummary(rows).duplicateCalendarIdCount).toBe(1)
  })

  it("warns when an existing event has the same title on the same local day", () => {
    const start = "2026-06-14T21:00:00.000Z"
    const sameDay = new Date(new Date(start).getTime() - 60 * 60 * 1000).toISOString()

    const rows = buildIcsImportReview([makeRow({ title: "  summer   OPEN ", startDateTime: start })], {
      calendarIds: [],
      scheduledEvents: [makeEvent({ title: "Summer Open", startDateTime: sameDay })],
    })

    expect(rows[0]?.status).toBe("valid")
    expect(rows[0]?.warnings.possibleDuplicateTitleDate).toBe(true)
    expect(createIcsImportSummary(rows).possibleDuplicateWarningsCount).toBe(1)
  })

  it("leaves rows that were not importable unchanged", () => {
    const skipped = makeRow({ status: "skipped_recurring", uid: "dup-1" })
    expect(buildIcsImportReview([skipped], { calendarIds: ["dup-1"], scheduledEvents: [] })).toEqual([skipped])
  })
})

describe("selectIcsImportRows / buildIcsImportCommitResult", () => {
  it("imports selected valid rows and reports duplicates found at insert time", () => {
    const review = makeReview([
      makeRow({ rowId: "row-1", uid: "uid-1", title: "First", warnings: { possibleDuplicateTitleDate: true } }),
      makeRow({ rowId: "row-2", uid: "uid-2", title: "Second" }),
      makeRow({ rowId: "row-3", uid: "uid-3", status: "skipped_past" }),
    ])

    const selection = selectIcsImportRows(review, ["row-1", "row-2", "row-2", "row-3", "missing"])
    expect(selection.selected.map(toIcsImportEventInput)).toEqual([
      {
        calendarId: "uid-1",
        title: "First",
        startDateTime: "2026-06-14T21:00:00.000Z",
        endDateTime: "2026-06-14T23:00:00.000Z",
        internalNotes: "Imported from Google Calendar:\n\nBring clubs",
      },
      {
        calendarId: "uid-2",
        title: "Second",
        startDateTime: "2026-06-14T21:00:00.000Z",
        endDateTime: "2026-06-14T23:00:00.000Z",
        internalNotes: "Imported from Google Calendar:\n\nBring clubs",
      },
    ])
    expect(selection.unavailableRowIds).toEqual(["row-3", "missing"])

    const result = buildIcsImportCommitResult(review, selection, {
      inserted: [makeEvent({ id: "new-1", title: "First", calendarId: "uid-1" })],
      duplicateCalendarIds: ["uid-2"],
    })

    expect(result).toEqual({
      importedCount: 1,
      skippedDuplicateCount: 1,
      // one past row skipped at review, plus two selections that were not importable
      skippedInvalidCount: 3,
      possibleDuplicateWarningsCount: 1,
      importedEvents: [{ id: "new-1", title: "First", startDateTime: null, endDateTime: null }],
      skippedInvalidRows: [
        { rowId: "row-3", title: null, reason: "unavailable_row" },
        { rowId: "missing", title: null, reason: "unavailable_row" },
        { rowId: "row-2", title: "Second", reason: "duplicate_calendar_id" },
      ],
    })
  })
})
