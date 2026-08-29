import type { WorkspaceCategoryId, WorkspaceNavModel, WorkspaceNavNode } from "../types"
import {
  buildCategoryNodeId,
  findCategoryNode,
  findNodeByTimeblockId,
  getNavigationTarget,
  getTimeblockIdFromNode,
  isWorkspaceCategoryId,
} from "./navPolicy"

export type WorkspaceSectionId = WorkspaceCategoryId

export const DEFAULT_EVENT_DETAIL_RETURN_TO = "/events"

export type EventDetailRouteParams = {
  id?: string
  section?: string
  timeblockId?: string
}

export interface EventDetailRouteState {
  selectedNodeId: string | null
  selectedTimeblockId: string | null
  selectedCategoryId: WorkspaceCategoryId | null
  returnTo: string
}

export function flattenNav(model: WorkspaceNavModel): WorkspaceNavNode[] {
  return [...model.scheduled, ...model.unscheduled, ...model.categories]
}

export function findNodeById(nodeId: string, allNodes: WorkspaceNavNode[]) {
  return allNodes.find((node) => node.id === nodeId) ?? null
}

/**
 * Resolve a clicked/selected nav node into the node id that should drive the URL.
 * Note/setup keep their individual identity; aggregate types remap to a category node.
 */
export function resolveSelectedNodeId(
  nodeId: string,
  navModel: WorkspaceNavModel,
  allNodes: WorkspaceNavNode[],
): string {
  const targetNode = findNodeById(nodeId, allNodes)
  if (!targetNode) return buildCategoryNodeId("overview")

  const navigationTarget = getNavigationTarget(targetNode)

  if (navigationTarget.kind === "individual-note") {
    // Prefer the live node (scheduled/unscheduled) so sidebar highlight matches placement.
    const liveNode = findNodeByTimeblockId(navigationTarget.timeblockId, navModel)
    return liveNode?.id ?? nodeId
  }

  const categoryNode = findCategoryNode(navigationTarget.categoryId, navModel)
  return categoryNode?.id ?? buildCategoryNodeId(navigationTarget.categoryId)
}

export function normalizeReturnTo(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_EVENT_DETAIL_RETURN_TO
  const trimmed = value.trim()
  if (trimmed.length === 0 || !trimmed.startsWith("/")) return DEFAULT_EVENT_DETAIL_RETURN_TO
  return trimmed
}

function normalizeSection(value: unknown): WorkspaceCategoryId | null {
  if (typeof value !== "string") return null
  // Legacy slugs that no longer exist — treat as invalid so they canonicalize to overview.
  if (value === "notes" || value === "setup" || value === "system" || value === "note") {
    return null
  }
  return isWorkspaceCategoryId(value) ? value : null
}

function appendReturnToQuery(path: string, returnTo: string): string {
  if (returnTo === DEFAULT_EVENT_DETAIL_RETURN_TO) return path
  const params = new URLSearchParams()
  params.set("returnTo", returnTo)
  return `${path}?${params.toString()}`
}

function isCategoryAvailable(categoryId: WorkspaceCategoryId, navModel: WorkspaceNavModel): boolean {
  if (categoryId === "overview") return true
  return findCategoryNode(categoryId, navModel) !== null
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
  const normalizedReturnTo = normalizeReturnTo(returnTo)
  const targetNode = findNodeById(selectedNodeId, allNodes)

  if (!targetNode) {
    // May be a note whose nav row is temporarily missing — try timeblock extraction from id.
    const fallbackOverview = appendReturnToQuery(
      `/events/${eventId}/overview`,
      normalizedReturnTo,
    )
    return fallbackOverview
  }

  const navigationTarget = getNavigationTarget(targetNode)

  if (navigationTarget.kind === "individual-note") {
    return appendReturnToQuery(
      `/events/${eventId}/note/${navigationTarget.timeblockId}`,
      normalizedReturnTo,
    )
  }

  if (!isCategoryAvailable(navigationTarget.categoryId, navModel)) {
    return appendReturnToQuery(`/events/${eventId}/overview`, normalizedReturnTo)
  }

  return appendReturnToQuery(
    `/events/${eventId}/${navigationTarget.categoryId}`,
    normalizedReturnTo,
  )
}

export function toNoteEditorPath(
  eventId: string,
  timeblockId: string,
  returnTo: string = DEFAULT_EVENT_DETAIL_RETURN_TO,
): string {
  return appendReturnToQuery(
    `/events/${eventId}/note/${timeblockId}`,
    normalizeReturnTo(returnTo),
  )
}

export function toCategoryPath(
  eventId: string,
  categoryId: WorkspaceCategoryId,
  returnTo: string = DEFAULT_EVENT_DETAIL_RETURN_TO,
): string {
  return appendReturnToQuery(
    `/events/${eventId}/${categoryId}`,
    normalizeReturnTo(returnTo),
  )
}

export function parseEventDetailRoute(
  params: EventDetailRouteParams,
  searchParams: URLSearchParams,
  navModel: WorkspaceNavModel,
): EventDetailRouteState {
  const returnTo = normalizeReturnTo(searchParams.get("returnTo"))
  const allNodes = flattenNav(navModel)

  if (allNodes.length === 0) {
    return {
      selectedNodeId: null,
      selectedTimeblockId: null,
      selectedCategoryId: null,
      returnTo,
    }
  }

  // Dedicated note route: /events/:id/note/:timeblockId
  const noteTimeblockId =
    typeof params.timeblockId === "string" && params.timeblockId.trim().length > 0
      ? params.timeblockId.trim()
      : null

  if (noteTimeblockId) {
    const noteNode = findNodeByTimeblockId(noteTimeblockId, navModel)
    if (noteNode) {
      return {
        selectedNodeId: noteNode.id,
        selectedTimeblockId: noteTimeblockId,
        selectedCategoryId: null,
        returnTo,
      }
    }

    // Stale / deleted note — fall back to overview (canonicalization will redirect).
    return {
      selectedNodeId: buildCategoryNodeId("overview"),
      selectedTimeblockId: null,
      selectedCategoryId: "overview",
      returnTo,
    }
  }

  const section = normalizeSection(params.section)

  if (section && isCategoryAvailable(section, navModel)) {
    const categoryNode = findCategoryNode(section, navModel)
    if (categoryNode) {
      return {
        selectedNodeId: categoryNode.id,
        selectedTimeblockId: null,
        selectedCategoryId: section,
        returnTo,
      }
    }
  }

  return {
    selectedNodeId: buildCategoryNodeId("overview"),
    selectedTimeblockId: null,
    selectedCategoryId: "overview",
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

  const returnTo = normalizeReturnTo(searchParams.get("returnTo"))
  const returnToSuffix =
    returnTo !== DEFAULT_EVENT_DETAIL_RETURN_TO
      ? `?returnTo=${encodeURIComponent(returnTo)}`
      : ""

  let currentPath: string
  if (params.timeblockId) {
    currentPath = `/events/${eventId}/note/${params.timeblockId}${returnToSuffix}`
  } else if (params.section) {
    // Rebuild without other query params; only returnTo is meaningful now.
    currentPath = `/events/${eventId}/${params.section}${returnToSuffix}`
  } else {
    currentPath = `/events/${eventId}${returnToSuffix}`
  }

  return canonicalPath === currentPath ? null : canonicalPath
}

export function buildEventDetailNavigationPath(
  eventId: string,
  navModel: WorkspaceNavModel,
  returnTo?: string,
): string {
  return toEventDetailPath({
    eventId,
    selectedNodeId: buildCategoryNodeId("overview"),
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

export function isNavNodeSelected(
  node: WorkspaceNavNode,
  selectedNodeId: string | null,
  selectedTimeblockId: string | null,
): boolean {
  if (selectedTimeblockId) {
    const nodeTimeblockId = getTimeblockIdFromNode(node)
    if (node.sourceRef.kind === "timeblock" && nodeTimeblockId === selectedTimeblockId) {
      return true
    }
    return false
  }

  return selectedNodeId !== null && node.id === selectedNodeId
}
