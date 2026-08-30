import {
  LayoutDashboard,
  UtensilsCrossed,
  Wine,
  Truck,
  Trophy,
  CircleDollarSign,
  type LucideIcon,
} from "lucide-react"

import { SECTION_TYPE } from "~/definitions/timeblocks/timeblock-constants"
import type { TimeblockType } from "~/definitions/timeblocks/timeblocks-types"
import type { TimelineRowSource } from "~/definitions/timeblocks/timeblocks-types"

import type { WorkspaceCategoryId, WorkspaceNavModel, WorkspaceNavNode } from "../types"

export type WorkspaceCategoryDefinition = {
  id: WorkspaceCategoryId
  label: string
  slug: WorkspaceCategoryId
  icon: LucideIcon
  /** When true, only shown for tournament events */
  tournamentOnly?: boolean
}

export const WORKSPACE_CATEGORIES = [
  {
    id: "overview",
    label: "Overview",
    slug: "overview",
    icon: LayoutDashboard,
  },
  {
    id: "food",
    label: "Food",
    slug: "food",
    icon: UtensilsCrossed,
  },
  {
    id: "beverage",
    label: "Beverage",
    slug: "beverage",
    icon: Wine,
  },
  {
    id: "logistics",
    label: "Logistics",
    slug: "logistics",
    icon: Truck,
  },
  {
    id: "tournament",
    label: "Tournament",
    slug: "tournament",
    icon: Trophy,
    tournamentOnly: true,
  },
  {
    id: "financial",
    label: "Financial",
    slug: "financial",
    icon: CircleDollarSign,
  },
] as const satisfies readonly WorkspaceCategoryDefinition[]

export const WORKSPACE_CATEGORY_IDS = WORKSPACE_CATEGORIES.map((category) => category.id)

const CATEGORY_ID_SET = new Set<string>(WORKSPACE_CATEGORY_IDS)

export function isWorkspaceCategoryId(value: string): value is WorkspaceCategoryId {
  return CATEGORY_ID_SET.has(value)
}

export function getWorkspaceCategoryDefinition(
  categoryId: WorkspaceCategoryId,
): WorkspaceCategoryDefinition {
  const match = WORKSPACE_CATEGORIES.find((category) => category.id === categoryId)
  if (!match) {
    throw new Error(`Unknown workspace category: ${categoryId}`)
  }
  return match
}

export function getAvailableWorkspaceCategories(
  eventType: string | undefined,
): WorkspaceCategoryDefinition[] {
  return WORKSPACE_CATEGORIES.filter((category) => {
    const definition = category as WorkspaceCategoryDefinition
    return !definition.tournamentOnly || eventType === "tournament"
  })
}

export function getSectionTypeLabel(sectionType: TimeblockType | undefined): string {
  switch (sectionType) {
    case SECTION_TYPE.FOOD:
      return "Food"
    case SECTION_TYPE.BEVERAGE:
      return "Beverage"
    case SECTION_TYPE.VENDOR:
      return "Logistics"
    case SECTION_TYPE.SETUP_INSTRUCTION:
      return "Setup Instruction"
    case SECTION_TYPE.NOTE:
      return "Note"
    case SECTION_TYPE.TOURNAMENT_DETAIL:
      return "Tournament"
    case SECTION_TYPE.CART_DETAIL:
      return "Cart Details"
    default:
      return "Details"
  }
}

export function isIndividualNoteSectionType(
  sectionType: TimeblockType | undefined,
): boolean {
  return (
    sectionType === SECTION_TYPE.NOTE || sectionType === SECTION_TYPE.SETUP_INSTRUCTION
  )
}

/** Timeblock types that open a focused single-record editor from the sidebar. */
export function isFocusedTimeblockSectionType(
  sectionType: TimeblockType | undefined,
): boolean {
  return (
    isIndividualNoteSectionType(sectionType) ||
    sectionType === SECTION_TYPE.FOOD ||
    sectionType === SECTION_TYPE.BEVERAGE
  )
}

/**
 * Aggregate category for timeblock section types that open a workspace.
 * Notes/setup return null because they open individual editors.
 * Food/beverage return their category for the icon-menu aggregate workspace;
 * sidebar food/beverage nodes still open focused editors via isFocusedTimeblockSectionType.
 */
export function getAggregateCategoryIdForSectionType(
  sectionType: TimeblockType | undefined,
): WorkspaceCategoryId | null {
  switch (sectionType) {
    case SECTION_TYPE.FOOD:
      return "food"
    case SECTION_TYPE.BEVERAGE:
      return "beverage"
    case SECTION_TYPE.VENDOR:
      return "logistics"
    case SECTION_TYPE.TOURNAMENT_DETAIL:
    case SECTION_TYPE.CART_DETAIL:
      return "tournament"
    case SECTION_TYPE.NOTE:
    case SECTION_TYPE.SETUP_INSTRUCTION:
      return null
    default:
      return null
  }
}

function getCategoryIdForSystemSource(source: string): WorkspaceCategoryId {
  switch (source as TimelineRowSource) {
    case "tournament_start":
    case "tournament_end":
    case "cart_detail":
      return "tournament"
    case "event_start":
    case "event_end":
    default:
      return "overview"
  }
}

export type NavigationTarget =
  | { kind: "focused-timeblock"; timeblockId: string }
  | { kind: "category"; categoryId: WorkspaceCategoryId }

/** @deprecated Use focused-timeblock — kept as a type alias for gradual migration */
export type LegacyIndividualNoteTarget = { kind: "individual-note"; timeblockId: string }

export function getNavigationTarget(node: WorkspaceNavNode): NavigationTarget {
  if (node.nodeType === "system" && node.sourceRef.kind === "system") {
    return {
      kind: "category",
      categoryId: getCategoryIdForSystemSource(node.sourceRef.source),
    }
  }

  if (node.nodeType === "financial") {
    return { kind: "category", categoryId: "financial" }
  }

  if (node.nodeType === "category" && node.sourceRef.kind === "category") {
    return { kind: "category", categoryId: node.sourceRef.categoryId }
  }

  if (node.nodeType === "timeblock") {
    if (isFocusedTimeblockSectionType(node.sectionType) && node.sourceRef.kind === "timeblock") {
      return { kind: "focused-timeblock", timeblockId: node.sourceRef.timeblockId }
    }

    const categoryId = getAggregateCategoryIdForSectionType(node.sectionType)
    if (categoryId) {
      return { kind: "category", categoryId }
    }
  }

  return { kind: "category", categoryId: "overview" }
}

// --- Node ID builders / parsers ---

export type ParsedNodeId =
  | { kind: "scheduled"; timeblockId: string }
  | { kind: "unscheduled"; timeblockId: string }
  | { kind: "category"; categoryId: WorkspaceCategoryId }

export function buildScheduledNodeId(timeblockId: string): string {
  return `scheduled:${timeblockId}`
}

export function buildUnscheduledNodeId(timeblockId: string): string {
  return `unscheduled:${timeblockId}`
}

export function buildCategoryNodeId(categoryId: WorkspaceCategoryId): string {
  return `category:${categoryId}`
}

export function parseNodeId(nodeId: string): ParsedNodeId | null {
  if (nodeId.startsWith("category:")) {
    const categoryId = nodeId.slice("category:".length)
    if (isWorkspaceCategoryId(categoryId)) {
      return { kind: "category", categoryId }
    }
    return null
  }

  if (nodeId.startsWith("scheduled:")) {
    const timeblockId = nodeId.slice("scheduled:".length)
    return timeblockId.length > 0 ? { kind: "scheduled", timeblockId } : null
  }

  if (nodeId.startsWith("unscheduled:")) {
    const timeblockId = nodeId.slice("unscheduled:".length)
    return timeblockId.length > 0 ? { kind: "unscheduled", timeblockId } : null
  }

  return null
}

export function getTimeblockIdFromNode(node: WorkspaceNavNode): string | null {
  if (node.sourceRef.kind === "timeblock") return node.sourceRef.timeblockId
  if (node.sourceRef.kind === "system") return node.sourceRef.syntheticId
  return null
}

export function findNodeByTimeblockId(
  timeblockId: string,
  navModel: WorkspaceNavModel,
): WorkspaceNavNode | null {
  const all = [...navModel.scheduled, ...navModel.unscheduled]
  return (
    all.find(
      (node) =>
        node.sourceRef.kind === "timeblock" && node.sourceRef.timeblockId === timeblockId,
    ) ?? null
  )
}

export function findCategoryNode(
  categoryId: WorkspaceCategoryId,
  navModel: WorkspaceNavModel,
): WorkspaceNavNode | null {
  return (
    navModel.categories.find(
      (node) =>
        (node.sourceRef.kind === "category" && node.sourceRef.categoryId === categoryId) ||
        (categoryId === "financial" && node.nodeType === "financial"),
    ) ?? null
  )
}

/** @deprecated Use getAggregateCategoryIdForSectionType — kept as a thin alias for gradual migration */
export function getWorkspaceCategoryIdForSectionType(
  sectionType: TimeblockType | undefined,
): WorkspaceCategoryId | null {
  return getAggregateCategoryIdForSectionType(sectionType)
}
