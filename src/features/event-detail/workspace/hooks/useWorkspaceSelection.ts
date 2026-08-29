import { useMemo } from "react"

import type { WorkspaceNavModel, WorkspaceSelection } from "../types"
import { useEventDetailRouteState } from "./useEventDetailRouteState"

export function useWorkspaceSelection(navModel: WorkspaceNavModel) {
  const routeState = useEventDetailRouteState(navModel)

  const selection: WorkspaceSelection = useMemo(
    () => ({
      selectedNodeId: routeState.selectedNodeId,
      selectedNode: routeState.selectedNode,
      selectedTimeblockId: routeState.selectedTimeblockId,
      selectedCategoryId: routeState.selectedCategoryId,
    }),
    [
      routeState.selectedCategoryId,
      routeState.selectedNode,
      routeState.selectedNodeId,
      routeState.selectedTimeblockId,
    ],
  )

  return {
    ...selection,
    setSelectedNodeId: routeState.selectNode,
    selectCategory: routeState.selectCategory,
    navigateToNote: routeState.navigateToNote,
    navigateToOverview: routeState.navigateToOverview,
    returnTo: routeState.returnTo,
  }
}
