import type { CreateTimeblockInput } from "~/definitions/timeblocks/timeblock-create"
import type { Timeblock, UpdateTimeblock } from "~/definitions/database"
import type { TimeblockType, TimeblockWithItems, TimelineTimeblock } from "~/definitions/timeblocks/timeblocks-types"
import type {
  ConversionImpact,
  ConvertTimeblockInput,
  ConvertTimeblockResult,
  InspectConversionInput,
} from "~/definitions/timeblocks/timeblock-conversion"

export function getTimeblocksByEventAndSection(eventId: string, sectionType: TimeblockType): Promise<TimeblockWithItems[]> {
  return window.electron.ipcRenderer.invoke("timeblocks:get-by-event-and-section", eventId, sectionType) as Promise<TimeblockWithItems[]>
}

export function getTimeblockById(id: string): Promise<TimeblockWithItems> {
  return window.electron.ipcRenderer.invoke("timeblocks:get-by-id", id) as Promise<TimeblockWithItems>
}

export function getAllTimelineBlocks(eventId: string): Promise<TimelineTimeblock[]> {
  return window.electron.ipcRenderer.invoke("timeblocks:get-all-timeline-blocks", eventId) as Promise<TimelineTimeblock[]>
}

export function createTimeblock(data: CreateTimeblockInput): Promise<Timeblock> {
  return window.electron.ipcRenderer.invoke("timeblocks:post", data) as Promise<Timeblock>
}

export function updateTimeblock(id: string, updates: UpdateTimeblock): Promise<Timeblock> {
  return window.electron.ipcRenderer.invoke("timeblocks:patch", id, updates) as Promise<Timeblock>
}

export function inspectTimeblockConversion(input: InspectConversionInput): Promise<ConversionImpact> {
  return window.electron.ipcRenderer.invoke("timeblocks:inspect-conversion", input) as Promise<ConversionImpact>
}

export function convertTimeblockSectionType(input: ConvertTimeblockInput): Promise<ConvertTimeblockResult> {
  return window.electron.ipcRenderer.invoke("timeblocks:convert-section-type", input) as Promise<ConvertTimeblockResult>
}

export function deleteTimeblock(id: string): Promise<boolean> {
  return window.electron.ipcRenderer.invoke("timeblocks:delete", id) as Promise<boolean>
}
