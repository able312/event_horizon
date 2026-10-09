import type { CreateTimeblockInput } from "~/definitions/timeblocks/timeblock-create"
import type { Timeblock, UpdateTimeblock } from "~/definitions/database"
import type { TimeblockType, TimeblockWithItems, TimelineTimeblock } from "~/definitions/timeblocks/timeblocks-types"
import {
  assertConvertibleTimeblockType,
  type ConversionImpact,
  type ConvertTimeblockInput,
  type ConvertTimeblockResult,
  type InspectConversionInput,
} from "~/definitions/timeblocks/timeblock-conversion"
import { api } from "../../../convex/_generated/api"
import { fetchSource, pickFields, runMutation, runQuery } from "./backend"
import { toId } from "./ids"
import { sources } from "./sources"

export function getTimeblocksByEventAndSection(eventId: string, sectionType: TimeblockType): Promise<TimeblockWithItems[]> {
  return fetchSource(sources.timeblocks.bySection(eventId, sectionType))
}

export function getTimeblockById(id: string): Promise<TimeblockWithItems> {
  return fetchSource(sources.timeblocks.byId(id))
}

/** Rows are placed in the desktop's time zone. */
export function getAllTimelineBlocks(eventId: string): Promise<TimelineTimeblock[]> {
  return fetchSource(sources.timeblocks.timeline(eventId))
}

export function createTimeblock(data: CreateTimeblockInput): Promise<Timeblock> {
  return runMutation(api.timeblocks.create, {
    ...pickFields(data, ["title", "time", "details", "sectionType", "prefill"]),
    eventId: toId<"events">(data.eventId),
  })
}

export function updateTimeblock(id: string, updates: UpdateTimeblock): Promise<Timeblock> {
  return runMutation(api.timeblocks.update, {
    id: toId<"timeblocks">(id),
    updates: pickFields(updates, ["title", "time", "details", "assignedTo"]),
  })
}

export function inspectTimeblockConversion(input: InspectConversionInput): Promise<ConversionImpact> {
  return runQuery(api.timeblocks.inspectConversion, {
    timeblockId: toId<"timeblocks">(input.timeblockId),
    toType: assertConvertibleTimeblockType(input.toType),
  })
}

export function convertTimeblockSectionType(input: ConvertTimeblockInput): Promise<ConvertTimeblockResult> {
  return runMutation(api.timeblocks.convertSectionType, {
    timeblockId: toId<"timeblocks">(input.timeblockId),
    toType: assertConvertibleTimeblockType(input.toType),
    ...(input.confirmDestructive !== undefined ? { confirmDestructive: input.confirmDestructive } : {}),
  })
}

export function deleteTimeblock(id: string): Promise<boolean> {
  return runMutation(api.timeblocks.remove, { id: toId<"timeblocks">(id) })
}
