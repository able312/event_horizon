import { getWorkspaceCategoryIdForSectionType } from "./getWorkspaceCategoryIdForSectionType"
import type { WorkspaceCategoryId, WorkspaceNavModel, WorkspaceNavNode } from "../types"

export type WorkspaceSectionId = WorkspaceCategoryId | "system"

export const DEFAULT_EVENT_DETAIL_RETURN_TO = "/events"

const CATEGORY_SECTIONS = new Set<WorkspaceCategoryId>([
  "overview",
  "food",
  "beverage",
  "logistics",
  "setup",
  "notes",
  "tournament",
  "financial",
])

const SECTION_VALUES = new Set<WorkspaceSectionId>([
  ...CATEGORY_SECTIONS,
  "system",
])

export interface EventDetailRouteParams {
  id?: string
  section?: string
}

export interface EventDetailRouteState {
  selectedNodeId: string | null
  returnTo: string
}

export function flattenNav(model: WorkspaceNavModel): WorkspaceNavNode[] {
  return [...model.scheduled, ...model.unscheduled, ...model.categories]
}

export function findNodeById(nodeId: string, allNodes: WorkspaceNavNode[]) {
  return allNodes.find((node) => node.id === nodeId) ?? null
}

export function resolveSelectedNodeId(
  nodeId: string,
  navModel: WorkspaceNavModel,
  allNodes: WorkspaceNavNode[],
) {
  const targetNode = findNodeById(nodeId, allNodes)
  if (!targetNode || targetNode.nodeType !== "timeblock") return nodeId

  const categoryId = getWorkspaceCategoryIdForSectionType(targetNode.sectionType)
  if (!categoryId) return nodeId

  const categoryNode = navModel.categories.find(
    (node) => node.sourceRef.kind === "category" && node.sourceRef.categoryId === categoryId,
  )
  return categoryNode?.id ?? nodeId
}

function normalizeSection(value: unknown): WorkspaceSectionId | null {
  if (typeof value !== "string") return null
  return SECTION_VALUES.has(value as WorkspaceSectionId) ? (value as WorkspaceSectionId) : null
}

export function normalizeReturnTo(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_EVENT_DETAIL_RETURN_TO
  const trimmed = value.trim()
  if (trimmed.length === 0 || !trimmed.startsWith("/")) return DEFAULT_EVENT_DETAIL_RETURN_TO
  return trimmed
}

function normalizeNode(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function nodeIdFromSection(section: WorkspaceSectionId): string {
  if (section === "system") return ""
  return `category:${section}`
}

export function sectionFromNodeId(
  nodeId: string,
  allNodes: WorkspaceNavNode[],
): WorkspaceSectionId | null {
  if (nodeId.startsWith("category:")) {
    const categoryId = nodeId.slice("category:".length) as WorkspaceCategoryId
    return CATEGORY_SECTIONS.has(categoryId) ? categoryId : null
  }

  if (nodeId.startsWith("system:")) {
    return "system"
  }

  const targetNode = findNodeById(nodeId, allNodes)
  if (targetNode?.nodeType === "timeblock") {
    const categoryId = getWorkspaceCategoryIdForSectionType(targetNode.sectionType)
    if (categoryId) return categoryId
  }

  return null
}

function isSectionAvailable(section: WorkspaceSectionId, navModel: WorkspaceNavModel): boolean {
  if (section === "system") {
    return navModel.scheduled.some((node) => node.nodeType === "system")
  }

  if (section === "financial") {
    return navModel.categories.some((node) => node.nodeType === "financial")
  }

  if (
    navModel.categories.some(
      (node) => node.sourceRef.kind === "category" && node.sourceRef.categoryId === section,
    )
  ) {
    return true
  }

  return flattenNav(navModel).some(
    (node) =>
      node.nodeType === "timeblock" &&
      getWorkspaceCategoryIdForSectionType(node.sectionType) === section,
  )
}

function isSectionValidForSelection(
  section: WorkspaceSectionId,
  selectedNodeId: string,
  navModel: WorkspaceNavModel,
  allNodes: WorkspaceNavNode[],
): boolean {
  if (isSectionAvailable(section, navModel)) return true

  const node = findNodeById(selectedNodeId, allNodes)
  return (
    node?.nodeType === "timeblock" &&
    getWorkspaceCategoryIdForSectionType(node.sectionType) === section
  )
}

function getFirstAvailableSection(navModel: WorkspaceNavModel): WorkspaceSectionId | null {
  const defaultNodeId = "category:overview"
  if (!defaultNodeId) return null

  const section = sectionFromNodeId(defaultNodeId, flattenNav(navModel))
  if (section && isSectionAvailable(section, navModel)) return section

  for (const candidate of CATEGORY_SECTIONS) {
    if (isSectionAvailable(candidate, navModel)) return candidate
  }

  if (isSectionAvailable("system", navModel)) return "system"

  return null
}

function isNodeQueryRedundant(section: WorkspaceSectionId, selectedNodeId: string): boolean {
  if (section === "system") return false
  return selectedNodeId === nodeIdFromSection(section)
}

export function toEventDetailPath({
  eventId,
  selectedNodeId,
  navModel,
  returnTo = DEFAULT_EVENT_DETAIL_RETURN_TO,
}: {
  eventId: string
  selectedNodeId: string
  navModel: WorkspaceNavModel
  returnTo?: string
}): string {
  const allNodes = flattenNav(navModel)
  const section = sectionFromNodeId(selectedNodeId, allNodes)
  const normalizedReturnTo = normalizeReturnTo(returnTo)

  if (!section || !isSectionValidForSelection(section, selectedNodeId, navModel, allNodes)) {
    const fallbackSection = getFirstAvailableSection(navModel)
    if (!fallbackSection) return `/events/${eventId}`

    const fallbackNodeId = nodeIdFromSection(fallbackSection) || "category:overview"
    if (!fallbackNodeId) return `/events/${eventId}`

    return toEventDetailPath({
      eventId,
      selectedNodeId: fallbackNodeId,
      navModel,
      returnTo: normalizedReturnTo,
    })
  }

  const params = new URLSearchParams()
  if (!isNodeQueryRedundant(section, selectedNodeId)) {
    params.set("node", selectedNodeId)
  }

  if (normalizedReturnTo !== DEFAULT_EVENT_DETAIL_RETURN_TO) {
    params.set("returnTo", normalizedReturnTo)
  }

  const query = params.toString()
  return query.length > 0 ? `/events/${eventId}/${section}?${query}` : `/events/${eventId}/${section}`
}

export function parseEventDetailRoute(
  params: EventDetailRouteParams,
  searchParams: URLSearchParams,
  navModel: WorkspaceNavModel,
): EventDetailRouteState {
  const allNodes = flattenNav(navModel)
  const returnTo = normalizeReturnTo(searchParams.get("returnTo"))
  const nodeParam = normalizeNode(searchParams.get("node"))
  const section = normalizeSection(params.section)

  if (allNodes.length === 0) {
    return { selectedNodeId: null, returnTo }
  }

  if (nodeParam && findNodeById(nodeParam, allNodes)) {
    return {
      selectedNodeId: resolveSelectedNodeId(nodeParam, navModel, allNodes),
      returnTo,
    }
  }

  if (section && isSectionAvailable(section, navModel)) {
    if (section === "system") {
      const systemNode = allNodes.find((node) => node.nodeType === "system")
      return {
        selectedNodeId: systemNode?.id ?? null,
        returnTo,
      }
    }

    const categoryNodeId = nodeIdFromSection(section)
    const categoryNode = findNodeById(categoryNodeId, allNodes)
    if (categoryNode) {
      return {
        selectedNodeId: categoryNode.id,
        returnTo,
      }
    }
  }

  if (section && section !== "system") {
    const matchingTimeblock = allNodes.find(
      (node) =>
        node.nodeType === "timeblock" &&
        getWorkspaceCategoryIdForSectionType(node.sectionType) === section,
    )

    if (matchingTimeblock) {
      return {
        selectedNodeId: resolveSelectedNodeId(matchingTimeblock.id, navModel, allNodes),
        returnTo,
      }
    }
  }

  return {
    selectedNodeId: "category:overview",
    returnTo,
  }
}

export function getCanonicalEventDetailPath({
  eventId,
  params,
  searchParams,
  navModel,
}: {
  eventId: string
  params: EventDetailRouteParams
  searchParams: URLSearchParams
  navModel: WorkspaceNavModel
}): string | null {
  const parsed = parseEventDetailRoute(params, searchParams, navModel)
  if (!parsed.selectedNodeId) return null

  const canonicalPath = toEventDetailPath({
    eventId,
    selectedNodeId: parsed.selectedNodeId,
    navModel,
    returnTo: parsed.returnTo,
  })

  const currentSection = normalizeSection(params.section)
  const currentPath =
    currentSection !== null
      ? `/events/${eventId}/${params.section}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`
      : `/events/${eventId}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`

  return canonicalPath === currentPath ? null : canonicalPath
}

export function buildEventDetailNavigationPath(
  eventId: string,
  navModel: WorkspaceNavModel,
  returnTo?: string,
): string {
  const defaultNodeId = "category:overview"
  if (!defaultNodeId) return buildEventDetailEntryPath(eventId, returnTo)

  return toEventDetailPath({
    eventId,
    selectedNodeId: defaultNodeId,
    navModel,
    returnTo,
  })
}

export function buildEventDetailEntryPath(eventId: string, returnTo?: string): string {
  const params = new URLSearchParams()
  const normalizedReturnTo = normalizeReturnTo(returnTo)

  if (normalizedReturnTo !== DEFAULT_EVENT_DETAIL_RETURN_TO) {
    params.set("returnTo", normalizedReturnTo)
  }

  const query = params.toString()
  return query.length > 0 ? `/events/${eventId}?${query}` : `/events/${eventId}`
}
