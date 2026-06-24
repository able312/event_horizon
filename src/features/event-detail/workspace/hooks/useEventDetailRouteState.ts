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
import type { WorkspaceNavModel, WorkspaceNavNode } from "../types"

export interface UseEventDetailRouteStateReturn {
  selectedNodeId: string | null
  selectedNode: WorkspaceNavNode | null
  returnTo: string
  selectNode: (nodeId: string) => void
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

  return {
    selectedNodeId,
    selectedNode,
    returnTo: routeState.returnTo,
    selectNode,
  }
}
