// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Event, NewEvent } from "../../definitions/database.js"
import {
  commitIcsImport,
  prepareIcsImportReview,
} from "./icsImportService.js"
import eventQueries from "../db/repository/events.js"

vi.mock("node:fs/promises", () => ({
  default: {
    readFile: vi.fn(),
  },
}))

vi.mock("../db/repository/events.js", () => ({
  default: {
    getByCalendarIds: vi.fn(),
    getScheduled: vi.fn(),
    insertMany: vi.fn(),
  },
}))

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "event-1",
    title: "Existing Event",
    type: "function",
    status: "new_lead",
    startDateTime: "2026-06-14T17:00:00.000Z",
    endDateTime: "2026-06-14T19:00:00.000Z",
    clientName: null,
    clientEmail: null,
    clientPhone: null,
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

async function setIcsContent(content: string) {
  const fsPromises = await import("node:fs/promises")
  vi.mocked(fsPromises.default.readFile).mockResolvedValue(content)
}

beforeEach(() => {
  vi.mocked(eventQueries.getByCalendarIds).mockReset()
  vi.mocked(eventQueries.getScheduled).mockReset()
  vi.mocked(eventQueries.insertMany).mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("icsImportService", () => {
  it("classifies valid, recurring, and invalid rows", async () => {
    await setIcsContent(`BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nUID:uid-1\nSUMMARY:Summer Open\nDTSTART;TZID=America/Toronto:20260614T170000\nDTEND;TZID=America/Toronto:20260614T190000\nDESCRIPTION:Bring clubs\nEND:VEVENT\nBEGIN:VEVENT\nUID:uid-2\nSUMMARY:All Day Event\nDTSTART;VALUE=DATE:20260615\nDTEND;VALUE=DATE:20260616\nEND:VEVENT\nBEGIN:VEVENT\nUID:uid-3\nSUMMARY:Weekly Event\nDTSTART;TZID=America/Toronto:20260620T100000\nDTEND;TZID=America/Toronto:20260620T110000\nRRULE:FREQ=WEEKLY;COUNT=10\nEND:VEVENT\nBEGIN:VEVENT\nSUMMARY:Missing UID\nDTSTART;TZID=America/Toronto:20260622T100000\nDTEND;TZID=America/Toronto:20260622T110000\nEND:VEVENT\nEND:VCALENDAR`)

    vi.mocked(eventQueries.getByCalendarIds).mockReturnValue([])
    vi.mocked(eventQueries.getScheduled).mockReturnValue([
      makeEvent({ title: "Summer Open", startDateTime: "2026-06-14T09:00:00.000Z" }),
    ])

    const payload = await prepareIcsImportReview("/tmp/events.ics")

    expect(payload.rows).toHaveLength(4)
    expect(payload.summary.validCount).toBe(2)
    expect(payload.summary.skippedRecurringCount).toBe(1)
    expect(payload.summary.skippedInvalidCount).toBe(1)
    expect(payload.summary.possibleDuplicateWarningsCount).toBe(1)

    const allDay = payload.rows.find((row) => row.uid === "uid-2")
    expect(allDay?.isAllDay).toBe(true)
    expect(allDay?.startDateTime).toMatch(/T04:00:00.000Z|T05:00:00.000Z/)
  })

  it("marks calendarId duplicates during review", async () => {
    await setIcsContent(`BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nUID:dup-1\nSUMMARY:Duplicate Event\nDTSTART;TZID=America/Toronto:20260614T170000\nDTEND;TZID=America/Toronto:20260614T180000\nEND:VEVENT\nEND:VCALENDAR`)

    vi.mocked(eventQueries.getByCalendarIds).mockReturnValue([
      makeEvent({ calendarId: "dup-1" }),
    ])
    vi.mocked(eventQueries.getScheduled).mockReturnValue([])

    const payload = await prepareIcsImportReview("/tmp/events.ics")
    expect(payload.summary.duplicateCalendarIdCount).toBe(1)
    expect(payload.rows[0]?.status).toBe("duplicate_calendar_id")
  })

  it("re-checks duplicates on commit and inserts only non-duplicates", async () => {
    await setIcsContent(`BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nUID:uid-commit\nSUMMARY:Commit Event\nDTSTART;TZID=America/Toronto:20260614T170000\nDTEND;TZID=America/Toronto:20260614T180000\nEND:VEVENT\nEND:VCALENDAR`)

    vi.mocked(eventQueries.getByCalendarIds)
      .mockReturnValueOnce([])
      .mockReturnValueOnce([makeEvent({ calendarId: "uid-commit" })])
    vi.mocked(eventQueries.getScheduled).mockReturnValue([])
    vi.mocked(eventQueries.insertMany).mockImplementation((rows: NewEvent[]) =>
      rows.map((row, index) =>
        makeEvent({
          id: `inserted-${index}`,
          title: row.title ?? "",
          startDateTime: row.startDateTime ?? null,
          endDateTime: row.endDateTime ?? null,
          calendarId: row.calendarId ?? null,
          internalNotes: row.internalNotes ?? null,
        }),
      ),
    )

    const payload = await prepareIcsImportReview("/tmp/events.ics")
    const validRow = payload.rows.find((row) => row.status === "valid")
    if (!validRow) throw new Error("Expected valid row")

    const result = await commitIcsImport({
      sessionId: payload.sessionId,
      selectedRowIds: [validRow.rowId],
    })

    expect(result.importedCount).toBe(0)
    expect(result.skippedDuplicateCount).toBe(1)
    expect(vi.mocked(eventQueries.insertMany)).toHaveBeenCalledWith([])
  })
})
