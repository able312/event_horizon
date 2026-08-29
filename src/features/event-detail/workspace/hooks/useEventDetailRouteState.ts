import { useCallback, useEffect, useMemo } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router"

import {
  findNodeById,
  flattenNav,
  getCanonicalEventDetailPath,
  parseEventDetailRoute,
  resolveSelectedNodeId,
  toEventDetailPath,
  type EventDetailRouteParams,
} from "../lib/eventDetailRouteState"
import type { WorkspaceCategoryId, WorkspaceNavModel, WorkspaceNavNode } from "../types"

export interface UseEventDetailRouteStateReturn {
  selectedNodeId: string | null
  selectedNode: WorkspaceNavNode | null
  selectedTimeblockId: string | null
  selectedCategoryId: WorkspaceCategoryId | null
  returnTo: string
  selectNode: (nodeId: string) => void
  selectCategory: (categoryId: WorkspaceCategoryId) => void
  navigateToNote: (timeblockId: string) => void
  navigateToOverview: () => void
}

export function useEventDetailRouteState(navModel: WorkspaceNavModel): UseEventDetailRouteStateReturn {
  const navigate = useNavigate()
  const params = useParams<EventDetailRouteParams>()
  const [searchParams] = useSearchParams()

  const eventId = params.id ?? ""
  const allNodes = useMemo(() => flattenNav(navModel), [navModel])

  const routeState = useMemo(
    () => parseEventDetailRoute(params, searchParams, navModel),
    [navModel, params, searchParams],
  )

  const selectedNodeId = routeState.selectedNodeId
  const selectedTimeblockId = routeState.selectedTimeblockId
  const selectedCategoryId = routeState.selectedCategoryId

  const selectedNode = useMemo(
    () => (selectedNodeId ? findNodeById(selectedNodeId, allNodes) : null),
    [allNodes, selectedNodeId],
  )

  useEffect(() => {
    if (!eventId || allNodes.length === 0) return

    const canonicalPath = getCanonicalEventDetailPath({
      eventId,
      params,
      searchParams,
      navModel,
    })

    if (!canonicalPath) return

    navigate(canonicalPath, { replace: true })
  }, [allNodes.length, eventId, navModel, navigate, params, searchParams])

  const selectNode = useCallback(
    (nodeId: string) => {
      if (!eventId || allNodes.length === 0) return

      const resolvedNodeId = resolveSelectedNodeId(nodeId, navModel, allNodes)
      const nextPath = toEventDetailPath({
        eventId,
        selectedNodeId: resolvedNodeId,
        navModel,
        returnTo: routeState.returnTo,
      })

      navigate(nextPath, { replace: true })
    },
    [allNodes, eventId, navModel, navigate, routeState.returnTo],
  )

  const selectCategory = useCallback(
    (categoryId: WorkspaceCategoryId) => {
      selectNode(`category:${categoryId}`)
    },
    [selectNode],
  )

  const navigateToNote = useCallback(
    (timeblockId: string) => {
      if (!eventId) return
      const params = new URLSearchParams()
      if (routeState.returnTo !== "/events") {
        params.set("returnTo", routeState.returnTo)
      }
      const query = params.toString()
      const path = query.length > 0
        ? `/events/${eventId}/note/${timeblockId}?${query}`
        : `/events/${eventId}/note/${timeblockId}`
      navigate(path, { replace: true })
    },
    [eventId, navigate, routeState.returnTo],
  )

  const navigateToOverview = useCallback(() => {
    selectCategory("overview")
  }, [selectCategory])

  return {
    selectedNodeId,
    selectedNode,
    selectedTimeblockId,
    selectedCategoryId,
    returnTo: routeState.returnTo,
    selectNode,
    selectCategory,
    navigateToNote,
    navigateToOverview,
  }
}
