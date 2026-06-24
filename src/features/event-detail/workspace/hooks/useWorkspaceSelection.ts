import { useMemo } from "react"

import type { WorkspaceNavModel, WorkspaceSelection } from "../types"
import { useEventDetailRouteState } from "./useEventDetailRouteState"

export function useWorkspaceSelection(navModel: WorkspaceNavModel) {
  const routeState = useEventDetailRouteState(navModel)

  const selection: WorkspaceSelection = useMemo(
    () => ({
      selectedNodeId: routeState.selectedNodeId,
      selectedNode: routeState.selectedNode,
    }),
    [routeState.selectedNode, routeState.selectedNodeId],
  )

  return {
    ...selection,
    setSelectedNodeId: routeState.selectNode,
    returnTo: routeState.returnTo,
  }
}
