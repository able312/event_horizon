import { ipcMain } from "electron"
import type { NewEvent, UpdateEvent } from "../../definitions/database.js"
import type { EventSearchRequest } from "../../definitions/ipc.js"
import type { IcsImportCommitRequest } from "../../definitions/events/icsImport.js"
import eventQueries from "../db/repository/events.js"
import { logAndThrow } from "./ipcErrors.js"
import { getMonthRangeUtcFromLocal } from "../../lib/months.js"
import { commitIcsImport } from "../services/icsImportService.js"

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

  ipcMain.handle("events:post", async (_event, newEvent: NewEvent) => {
    try {
      return eventQueries.insert(newEvent)
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

  ipcMain.handle("events:import-ics:commit", async (_event, payload: IcsImportCommitRequest) => {
    try {
      return await commitIcsImport(payload)
    } catch (err) {
      logAndThrow("Error committing ICS import:", err)
    }
  })
}
