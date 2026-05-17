import { useEffect, useMemo, useState } from "react"
import { getWorkspaceCategoryIdForSectionType } from "../lib/getWorkspaceCategoryIdForSectionType"
import type { WorkspaceNavModel, WorkspaceNavNode, WorkspaceSelection } from "../types"

function flattenNav(model: WorkspaceNavModel): WorkspaceNavNode[] {
  return [...model.scheduled, ...model.unscheduled, ...model.categories]
}

function findNodeById(nodeId: string, allNodes: WorkspaceNavNode[]) {
  return allNodes.find((node) => node.id === nodeId) ?? null
}

function resolveSelectedNodeId(nodeId: string, navModel: WorkspaceNavModel, allNodes: WorkspaceNavNode[]) {
  const targetNode = findNodeById(nodeId, allNodes)
  if (!targetNode || targetNode.nodeType !== "timeblock") return nodeId

  const categoryId = getWorkspaceCategoryIdForSectionType(targetNode.sectionType)
  if (!categoryId) return nodeId

  const categoryNode = navModel.categories.find((node) => node.sourceRef.kind === "category" && node.sourceRef.categoryId === categoryId)
  return categoryNode?.id ?? nodeId
}

export function useWorkspaceSelection(navModel: WorkspaceNavModel) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  const allNodes = useMemo(() => flattenNav(navModel), [navModel])

  useEffect(() => {
    if (allNodes.length === 0) {
      setSelectedNodeId(null)
      return
    }

    if (!selectedNodeId || !allNodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(resolveSelectedNodeId(allNodes[0].id, navModel, allNodes))
    }
  }, [allNodes, navModel, selectedNodeId])

  const handleSelectNode = (nodeId: string) => {
    setSelectedNodeId(resolveSelectedNodeId(nodeId, navModel, allNodes))
  }

  const selection: WorkspaceSelection = useMemo(() => {
    const selectedNode = allNodes.find((node) => node.id === selectedNodeId) ?? null
    return {
      selectedNodeId,
      selectedNode,
    }
  }, [allNodes, selectedNodeId])

  return {
    ...selection,
    setSelectedNodeId: handleSelectNode,
  }
}
