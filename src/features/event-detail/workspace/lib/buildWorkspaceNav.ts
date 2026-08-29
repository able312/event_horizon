import type { Event } from "~/definitions/database"
import type { TimeblockWithItems, TimelineTimeblock } from "~/definitions/timeblocks/timeblocks-types"
import type { WorkspaceNavModel, WorkspaceNavNode } from "../types"
import {
  buildCategoryNodeId,
  buildScheduledNodeId,
  buildUnscheduledNodeId,
  getAvailableWorkspaceCategories,
  getSectionTypeLabel,
} from "./navPolicy"

const HHMM_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

function isValidHHmm(time: string | null | undefined): time is string {
  return typeof time === "string" && HHMM_PATTERN.test(time)
}

function sortByTimeThenLabel(a: WorkspaceNavNode, b: WorkspaceNavNode): number {
  const timeA = a.time ?? "99:99"
  const timeB = b.time ?? "99:99"
  const timeCompare = timeA.localeCompare(timeB)
  if (timeCompare !== 0) return timeCompare

  const labelCompare = a.label.localeCompare(b.label)
  if (labelCompare !== 0) return labelCompare

  return a.id.localeCompare(b.id)
}

function dedupeById(rows: TimeblockWithItems[]): TimeblockWithItems[] {
  const seen = new Set<string>()
  const result: TimeblockWithItems[] = []

  for (const row of rows) {
    if (seen.has(row.id)) continue
    seen.add(row.id)
    result.push(row)
  }

  return result
}

function buildCategoryNodes(event: Event | undefined): WorkspaceNavNode[] {
  return getAvailableWorkspaceCategories(event?.type).map((category) => ({
    id: buildCategoryNodeId(category.id),
    groupId: "categories" as const,
    nodeType: category.id === "financial" ? ("financial" as const) : ("category" as const),
    label: category.label,
    sourceRef:
      category.id === "financial"
        ? { kind: "financial" as const, view: "overview" as const }
        : { kind: "category" as const, categoryId: category.id },
  }))
}

export function buildWorkspaceNav({
  event,
  timelineRows,
  sectionRows,
}: {
  event: Event | undefined
  timelineRows: TimelineTimeblock[]
  sectionRows: TimeblockWithItems[]
}): WorkspaceNavModel {
  const scheduled = timelineRows
    .filter((row) => isValidHHmm(row.time))
    .map<WorkspaceNavNode>((row) => {
      const isSystem = row.timelineMeta?.isSystem === true

      return {
        id: buildScheduledNodeId(row.id),
        groupId: "scheduled",
        nodeType: isSystem ? "system" : "timeblock",
        label: row.title || "Untitled",
        subLabel: getSectionTypeLabel(row.sectionType),
        time: row.time,
        assignedTo: row.assignedTo,
        sectionType: row.sectionType,
        isSystem,
        isEditable: row.timelineMeta?.isEditable ?? true,
        sourceRef: isSystem
          ? { kind: "system", source: row.timelineMeta.source, syntheticId: row.id }
          : { kind: "timeblock", timeblockId: row.id },
      }
    })
    .sort(sortByTimeThenLabel)

  const unscheduled = dedupeById(sectionRows)
    .filter((row) => !isValidHHmm(row.time))
    .map<WorkspaceNavNode>((row) => ({
      id: buildUnscheduledNodeId(row.id),
      groupId: "unscheduled",
      nodeType: "timeblock",
      label: row.title || "Untitled",
      subLabel: getSectionTypeLabel(row.sectionType),
      time: row.time,
      assignedTo: row.assignedTo,
      sectionType: row.sectionType,
      isSystem: false,
      isEditable: true,
      sourceRef: { kind: "timeblock", timeblockId: row.id },
    }))
    .sort((a, b) => {
      const subCompare = (a.subLabel ?? "").localeCompare(b.subLabel ?? "")
      if (subCompare !== 0) return subCompare
      return a.label.localeCompare(b.label)
    })

  const categories = buildCategoryNodes(event)

  return {
    scheduled,
    unscheduled,
    categories,
  }
}
