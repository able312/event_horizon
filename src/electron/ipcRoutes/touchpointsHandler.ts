import { ipcMain } from "electron"

import type { NewTouchpoint, UpdateTouchpoint } from "../../definitions/database.js"
import touchpointQueries from "../db/repository/touchpoints.js"
import { logAndThrow } from "./ipcErrors.js"

export const registerTouchpointsIpcHandlers = () => {
  ipcMain.handle("touchpoints:get-many-by-event-id", async (_event, eventId: string) => {
    try {
      return touchpointQueries.getByEventId(eventId)
    } catch (err) {
      logAndThrow("Error getting touchpoints by event:", err)
    }
  })

  ipcMain.handle("touchpoints:get-many-incomplete", async () => {
    try {
      return touchpointQueries.getIncompleteWithEvent()
    } catch (err) {
      logAndThrow("Error getting incomplete touchpoints:", err)
    }
  })

  ipcMain.handle("touchpoints:get-incomplete-by-event-id", async (_event, eventId: string) => {
    try {
      return touchpointQueries.getIncompleteByEventId(eventId)
    } catch (err) {
      logAndThrow("Error getting incomplete touchpoints for event:", err)
    }
  })

  ipcMain.handle(
    "touchpoints:post",
    async (
      _event,
      eventId: string,
      values?: Partial<Pick<NewTouchpoint, "title" | "dueDate" | "completedAt">>,
    ) => {
      try {
        return touchpointQueries.insert(eventId, values)
      } catch (err) {
        logAndThrow("Error creating touchpoint:", err)
      }
    },
  )

  ipcMain.handle(
    "touchpoints:patch",
    async (_event, id: string, updates: UpdateTouchpoint) => {
      try {
        return touchpointQueries.update(id, updates)
      } catch (err) {
        logAndThrow("Error updating touchpoint:", err)
      }
    },
  )

  ipcMain.handle("touchpoints:delete", async (_event, id: string) => {
    try {
      return touchpointQueries.delete(id)
    } catch (err) {
      logAndThrow("Error deleting touchpoint:", err)
    }
  })

  ipcMain.handle("touchpoints:seed-common", async (_event, eventId: string) => {
    try {
      return touchpointQueries.seedCommon(eventId)
    } catch (err) {
      logAndThrow("Error seeding common touchpoints:", err)
    }
  })
}
