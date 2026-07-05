import type { Event } from "~/definitions/database"
import type { TimeblockWithItems, TimelineTimeblock } from "~/definitions/timeblocks/timeblocks-types"
import { SECTION_TYPE } from "~/definitions/timeblocks/timeblock-constants"
import type {
  WorkspaceCategoryId,
  WorkspaceNavModel,
  WorkspaceNavNode,
} from "../types"

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

function toSectionSubLabel(sectionType: TimeblockWithItems["sectionType"]): string {
  switch (sectionType) {
    case SECTION_TYPE.FOOD:
      return "Food"
    case SECTION_TYPE.BEVERAGE:
      return "Beverage"
    case SECTION_TYPE.VENDOR:
      return "Logistics"
    case SECTION_TYPE.SETUP_INSTRUCTION:
      return "Setup"
    case SECTION_TYPE.NOTE:
      return "Notes"
    case SECTION_TYPE.TOURNAMENT_DETAIL:
      return "Tournament"
    case SECTION_TYPE.CART_DETAIL:
      return "Logistics"
    default:
      return "Details"
  }
}

function buildCategoryNodes(event: Event | undefined): WorkspaceNavNode[] {
  const categories: Array<{ id: WorkspaceCategoryId; label: string; nodeType: WorkspaceNavNode["nodeType"] }> = [
    { id: "overview", label: "Overview", nodeType: "category" },
    { id: "food", label: "Food", nodeType: "category" },
    { id: "beverage", label: "Beverage", nodeType: "category" },
    { id: "logistics", label: "Logistics", nodeType: "category" },
    { id: "setup", label: "Setup", nodeType: "category" },
    { id: "notes", label: "Notes", nodeType: "category" },
    ...(event?.type === "tournament" ? [{ id: "tournament" as const, label: "Tournament", nodeType: "category" as const }] : []),
    { id: "financial", label: "Financial", nodeType: "financial" },
  ]

  return categories.map((category) => ({
    id: `category:${category.id}`,
    groupId: "categories",
    nodeType: category.nodeType,
    label: category.label,
    sourceRef:
      category.id === "financial"
        ? { kind: "financial", view: "overview" as const }
        : { kind: "category", categoryId: category.id },
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
        id: `scheduled:${row.id}`,
        groupId: "scheduled",
        nodeType: isSystem ? "system" : "timeblock",
        label: row.title || "Untitled",
        subLabel: toSectionSubLabel(row.sectionType),
        time: row.time,
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
      id: `unscheduled:${row.id}`,
      groupId: "unscheduled",
      nodeType: "timeblock",
      label: row.title || "Untitled",
      subLabel: toSectionSubLabel(row.sectionType),
      time: row.time,
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
