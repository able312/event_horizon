import { useMemo } from "react"

import type { WorkspaceNavModel, WorkspaceNavNode } from "../types"

function matchesQuery(node: WorkspaceNavNode, normalizedQuery: string): boolean {
  if (normalizedQuery.length === 0) return true

  const haystacks = [
    node.label,
    node.subLabel,
    node.time,
    node.assignedTo,
  ]

  return haystacks.some(
    (value) => typeof value === "string" && value.toLowerCase().includes(normalizedQuery),
  )
}

export function filterWorkspaceNavNodes(
  nodes: WorkspaceNavNode[],
  query: string,
): WorkspaceNavNode[] {
  const normalizedQuery = query.trim().toLowerCase()
  if (normalizedQuery.length === 0) return nodes
  return nodes.filter((node) => matchesQuery(node, normalizedQuery))
}

export function useWorkspaceNavFilter(navModel: WorkspaceNavModel, query: string) {
  return useMemo(() => {
    return {
      scheduled: filterWorkspaceNavNodes(navModel.scheduled, query),
      unscheduled: filterWorkspaceNavNodes(navModel.unscheduled, query),
      categories: navModel.categories,
      query: query.trim(),
      isFiltering: query.trim().length > 0,
    }
  }, [navModel, query])
}
