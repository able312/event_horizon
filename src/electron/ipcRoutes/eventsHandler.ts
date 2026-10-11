import { ipcMain } from "electron"
import type { NewContact } from "../../definitions/contacts.js"
import type { NewEvent, UpdateEvent } from "../../definitions/database.js"
import type { EventSearchRequest } from "../../definitions/ipc.js"
import type { IcsImportEventInput } from "../../definitions/events/icsImport.js"
import eventQueries from "../db/repository/events.js"
import { logAndThrow } from "./ipcErrors.js"
import { getMonthRangeUtcFromLocal } from "../../lib/months.js"
import eventCreationService from "../services/eventCreationService.js"

function assertNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} is required`)
  }
  return value.trim()
}

function assertIsoDateTime(value: unknown, label: string): string {
  const text = assertNonEmptyString(value, label)
  if (Number.isNaN(Date.parse(text))) throw new Error(`${label} must be a valid ISO datetime`)
  return text
}

function parseStringList(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`)
  return value.map((entry) => assertNonEmptyString(entry, label))
}

/** Validates calendar import rows from the renderer before they reach the database. */
export function parseIcsImportEventInputs(value: unknown): IcsImportEventInput[] {
  if (!Array.isArray(value)) throw new Error("ICS import rows must be an array")

  return value.map((entry, index) => {
    if (!entry || typeof entry !== "object") throw new Error(`ICS import row ${index} is invalid`)
    const row = entry as Record<string, unknown>
    const internalNotes = row.internalNotes ?? null
    if (internalNotes !== null && typeof internalNotes !== "string") {
      throw new Error(`ICS import row ${index}: internalNotes must be a string`)
    }

    return {
      calendarId: assertNonEmptyString(row.calendarId, `ICS import row ${index}: calendarId`),
      title: assertNonEmptyString(row.title, `ICS import row ${index}: title`),
      startDateTime: assertIsoDateTime(row.startDateTime, `ICS import row ${index}: startDateTime`),
      endDateTime: assertIsoDateTime(row.endDateTime, `ICS import row ${index}: endDateTime`),
      internalNotes,
    }
  })
}

export const registerEventsIpcHandlers = () => {
  ipcMain.handle("events:get-many", async () => {
    try {
      return eventQueries.getAll()
    } catch (err) {
      logAndThrow("Error getting events:", err)
    }
  })

  ipcMain.handle("events:get-by-month", async (_event, month: string) => {
    try {
      const monthRange = getMonthRangeUtcFromLocal(month)
      if (!monthRange) {
        throw new Error(`Invalid month format: ${month}`)
      }

      return eventQueries.getByMonthRange(
        monthRange.startInclusiveIso,
        monthRange.endExclusiveIso,
      )
    } catch (err) {
      logAndThrow("Error getting events by month:", err)
    }
  })

  ipcMain.handle("events:get-unscheduled", async () => {
    try {
      return eventQueries.getUnscheduled()
    } catch (err) {
      logAndThrow("Error getting unscheduled events:", err)
    }
  })

  ipcMain.handle("events:search", async (_event, payload: EventSearchRequest) => {
    try {
      return eventQueries.search(payload)
    } catch (err) {
      logAndThrow("Error searching events:", err)
    }
  })

  ipcMain.handle("events:get-by-id", async (_event, id: string) => {
    try {
      return eventQueries.getById(id)
    } catch (err) {
      logAndThrow("Error getting event:", err)
    }
  })

  ipcMain.handle("events:post", async (_event, newEvent: NewEvent, client?: NewContact | null) => {
    try {
      return eventCreationService.create(newEvent, client)
    } catch (err) {
      logAndThrow("Error creating event:", err)
    }
  })

  ipcMain.handle("events:patch", async (_event, id: string, updates: UpdateEvent) => {
    try {
      return eventQueries.update(id, updates)
    } catch (err) {
      logAndThrow("Error updating event:", err)
    }
  })

  ipcMain.handle("events:delete", async (_event, id: string) => {
    try {
      return eventQueries.delete(id)
    } catch (err) {
      logAndThrow("Error deleting event:", err)
    }
  })

  ipcMain.handle("events:get-by-calendar-ids", async (_event, calendarIds: unknown) => {
    try {
      return eventQueries.getByCalendarIds(parseStringList(calendarIds, "calendarIds"))
    } catch (err) {
      logAndThrow("Error getting events by calendar id:", err)
    }
  })

  ipcMain.handle("events:get-by-start-range", async (_event, startFrom: unknown, startTo: unknown) => {
    try {
      return eventQueries.getByMonthRange(
        assertIsoDateTime(startFrom, "startFrom"),
        assertIsoDateTime(startTo, "startTo"),
      )
    } catch (err) {
      logAndThrow("Error getting events by start range:", err)
    }
  })

  ipcMain.handle("events:import-ics:insert", async (_event, rows: unknown) => {
    try {
      return eventQueries.importFromCalendar(parseIcsImportEventInputs(rows))
    } catch (err) {
      logAndThrow("Error importing calendar events:", err)
    }
  })
}
