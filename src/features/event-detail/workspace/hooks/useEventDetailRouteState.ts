import { useCallback, useEffect, useMemo } from "react"
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router"

import {
  findNodeById,
  flattenNav,
  getCanonicalEventDetailPath,
  parseEventDetailRoute,
  resolveSelectedNodeId,
  toEventDetailPath,
  toFocusedTimeblockPath,
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
  navigateToTimeblock: (timeblockId: string) => void
  navigateToOverview: () => void
}

export function useEventDetailRouteState(navModel: WorkspaceNavModel): UseEventDetailRouteStateReturn {
  const navigate = useNavigate()
  const location = useLocation()
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
    if (!eventId) return
    // Allow focused routes to stay put while nav is still loading.
    if (allNodes.length === 0 && !selectedTimeblockId) return

    const canonicalPath = getCanonicalEventDetailPath({
      eventId,
      params,
      searchParams,
      navModel,
      pathname: location.pathname,
    })

    if (!canonicalPath) return

    navigate(canonicalPath, { replace: true })
  }, [
    allNodes.length,
    eventId,
    location.pathname,
    navModel,
    navigate,
    params,
    searchParams,
    selectedTimeblockId,
  ])

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

  const navigateToTimeblock = useCallback(
    (timeblockId: string) => {
      if (!eventId) return
      navigate(toFocusedTimeblockPath(eventId, timeblockId, routeState.returnTo), { replace: true })
    },
    [eventId, navigate, routeState.returnTo],
  )

  const navigateToNote = navigateToTimeblock

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
    navigateToTimeblock,
    navigateToOverview,
  }
}
