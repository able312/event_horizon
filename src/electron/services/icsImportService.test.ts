// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { parseIcsImportFile } from "./icsImportService.js"

vi.mock("node:fs/promises", () => ({
  default: {
    readFile: vi.fn(),
  },
}))

async function setIcsContent(content: string) {
  const fsPromises = await import("node:fs/promises")
  vi.mocked(fsPromises.default.readFile).mockResolvedValue(content)
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-06-01T12:00:00.000Z"))
})

afterEach(() => {
  try {
    vi.clearAllMocks()
  } finally {
    vi.useRealTimers()
  }
})

describe("parseIcsImportFile", () => {
  it("classifies valid, recurring, and invalid rows", async () => {
    await setIcsContent(`BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nUID:uid-1\nSUMMARY:Summer Open\nDTSTART;TZID=America/Toronto:20260614T170000\nDTEND;TZID=America/Toronto:20260614T190000\nDESCRIPTION:Bring clubs\nEND:VEVENT\nBEGIN:VEVENT\nUID:uid-2\nSUMMARY:All Day Event\nDTSTART;VALUE=DATE:20260615\nDTEND;VALUE=DATE:20260616\nEND:VEVENT\nBEGIN:VEVENT\nUID:uid-3\nSUMMARY:Weekly Event\nDTSTART;TZID=America/Toronto:20260620T100000\nDTEND;TZID=America/Toronto:20260620T110000\nRRULE:FREQ=WEEKLY;COUNT=10\nEND:VEVENT\nBEGIN:VEVENT\nSUMMARY:Missing UID\nDTSTART;TZID=America/Toronto:20260622T100000\nDTEND;TZID=America/Toronto:20260622T110000\nEND:VEVENT\nEND:VCALENDAR`)

    const payload = await parseIcsImportFile("/tmp/events.ics")

    expect(payload.sourceFileName).toBe("events.ics")
    expect(payload.rows.map((row) => row.status)).toEqual(["valid", "valid", "skipped_recurring", "invalid"])
    expect(payload.rows.find((row) => row.uid === "uid-1")?.internalNotes).toBe(
      "Imported from Google Calendar:\n\nBring clubs",
    )
    expect(payload.rows.every((row) => !row.warnings.possibleDuplicateTitleDate)).toBe(true)

    const allDay = payload.rows.find((row) => row.uid === "uid-2")
    expect(allDay?.isAllDay).toBe(true)
    expect(allDay?.startDateTime).toMatch(/T04:00:00.000Z|T05:00:00.000Z/)
  })

  it("skips events before today and keeps notes only on importable rows", async () => {
    await setIcsContent(`BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nUID:past-1\nSUMMARY:Last Year\nDTSTART;TZID=America/Toronto:20250614T170000\nDTEND;TZID=America/Toronto:20250614T180000\nDESCRIPTION:Old notes\nEND:VEVENT\nEND:VCALENDAR`)

    const payload = await parseIcsImportFile("/tmp/events.ics")

    expect(payload.rows[0]?.status).toBe("skipped_past")
    expect(payload.rows[0]?.internalNotes).toBeNull()
  })
})
