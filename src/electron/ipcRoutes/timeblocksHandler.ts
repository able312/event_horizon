import { ipcMain } from "electron"
import timeblockQueries from "../db/repository/timeblocks.js"
import type { CreateTimeblockInput } from "../../definitions/timeblocks/timeblock-create.js"
import type { TimeblockType, TimelineTimeblock } from "../../definitions/timeblocks/timeblocks-types.js"
import type { UpdateTimeblock } from "../../definitions/database.js"
import {
  assertConvertibleTimeblockType,
  type ConvertTimeblockInput,
  type InspectConversionInput,
} from "../../definitions/timeblocks/timeblock-conversion.js"
import { SECTION_TYPE } from "../../definitions/timeblocks/timeblock-constants.js"
import { logAndThrow } from "./ipcErrors.js"

const TIMEBLOCK_TYPES = new Set<string>(Object.values(SECTION_TYPE))

function assertNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} is required`)
  }
  return value.trim()
}

function assertTimeblockType(value: unknown): TimeblockType {
  if (typeof value !== "string" || !TIMEBLOCK_TYPES.has(value)) {
    throw new Error(`Invalid timeblock section type: ${String(value)}`)
  }
  return value as TimeblockType
}

function pickAllowlistedUpdates(updates: unknown): UpdateTimeblock {
  if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
    throw new Error("updateTimeblock: updates are required")
  }

  const source = updates as Record<string, unknown>
  const next: UpdateTimeblock = {}

  if ("title" in source) {
    if (typeof source.title !== "string") throw new Error("updateTimeblock: title must be a string")
    next.title = source.title
  }
  if ("time" in source) {
    if (source.time !== null && typeof source.time !== "string") {
      throw new Error("updateTimeblock: time must be a string or null")
    }
    next.time = source.time as string | null
  }
  if ("details" in source) {
    if (source.details !== null && typeof source.details !== "string") {
      throw new Error("updateTimeblock: details must be a string or null")
    }
    next.details = source.details as string | null
  }
  if ("assignedTo" in source) {
    if (source.assignedTo !== null && typeof source.assignedTo !== "string") {
      throw new Error("updateTimeblock: assignedTo must be a string or null")
    }
    next.assignedTo = source.assignedTo as string | null
  }

  if (Object.keys(next).length === 0) {
    throw new Error("updateTimeblock: updates are required")
  }

  return next
}

export const registerTimeblocksIpcHandlers = () => {
  ipcMain.handle("timeblocks:get-by-event-and-section", async (_event, eventId: string, sectionType: TimeblockType) => {
    try {
      return await timeblockQueries.getByEventIdAndSectionType(
        assertNonEmptyString(eventId, "eventId"),
        assertTimeblockType(sectionType),
      )
    } catch (err) {
      logAndThrow("Error fetching timeblocks by section:", err)
    }
  })

  ipcMain.handle("timeblocks:get-by-id", async (_event, id: string) => {
    try {
      return await timeblockQueries.getByIdWithItems(assertNonEmptyString(id, "id"))
    } catch (err) {
      logAndThrow("Error fetching timeblock by id:", err)
    }
  })

  ipcMain.handle("timeblocks:post", async (_event, data: CreateTimeblockInput) => {
    try {
      return timeblockQueries.insert(data)
    } catch (err) {
      logAndThrow("Error creating timeblock:", err)
    }
  })

  ipcMain.handle("timeblocks:patch", async (_event, id: string, updates: UpdateTimeblock) => {
    try {
      return timeblockQueries.update(assertNonEmptyString(id, "id"), pickAllowlistedUpdates(updates))
    } catch (err) {
      logAndThrow("Error updating timeblock:", err)
    }
  })

  ipcMain.handle("timeblocks:inspect-conversion", async (_event, input: InspectConversionInput) => {
    try {
      const timeblockId = assertNonEmptyString(input?.timeblockId, "timeblockId")
      const toType = assertConvertibleTimeblockType(assertTimeblockType(input?.toType))
      return await timeblockQueries.inspectConversion({ timeblockId, toType })
    } catch (err) {
      logAndThrow("Error inspecting timeblock conversion:", err)
    }
  })

  ipcMain.handle("timeblocks:convert-section-type", async (_event, input: ConvertTimeblockInput) => {
    try {
      const timeblockId = assertNonEmptyString(input?.timeblockId, "timeblockId")
      const toType = assertConvertibleTimeblockType(assertTimeblockType(input?.toType))
      const confirmDestructive = input?.confirmDestructive === true
      return timeblockQueries.convertSectionType({ timeblockId, toType, confirmDestructive })
    } catch (err) {
      logAndThrow("Error converting timeblock section type:", err)
    }
  })

  ipcMain.handle("timeblocks:delete", async (_event, id: string) => {
    try {
      return timeblockQueries.delete(assertNonEmptyString(id, "id"))
    } catch (err) {
      logAndThrow("Error deleting timeblock:", err)
    }
  })

  ipcMain.handle("timeblocks:get-all-timeline-blocks", async (_event, eventId: string): Promise<TimelineTimeblock[]> => {
    try {
      return timeblockQueries.getAllTimelineBlocks(assertNonEmptyString(eventId, "eventId"))
    } catch (err) {
      logAndThrow("Error getting all timeblocks with items:", err)
    }
  })
}
