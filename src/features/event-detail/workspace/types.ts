import type { Event, UpdateEvent } from "~/definitions/database"
import type { TimeblockType, TimelineTimeblock, TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"

export type WorkspaceCategoryId =
  | "overview"
  | "food"
  | "beverage"
  | "logistics"
  | "tournament"
  | "financial"

export type WorkspaceNodeType = "timeblock" | "category" | "financial" | "system"

export type WorkspaceNavGroupId = "scheduled" | "unscheduled" | "categories"

export type WorkspaceNodeSourceRef =
  | { kind: "timeblock"; timeblockId: string }
  | { kind: "category"; categoryId: WorkspaceCategoryId }
  | { kind: "financial"; view: "overview" }
  | { kind: "system"; source: string; syntheticId: string }

export interface WorkspaceNavNode {
  id: string
  groupId: WorkspaceNavGroupId
  nodeType: WorkspaceNodeType
  label: string
  subLabel?: string
  time?: string | null
  assignedTo?: string | null
  sectionType?: TimeblockType
  isSystem?: boolean
  isEditable?: boolean
  sourceRef: WorkspaceNodeSourceRef
}

export interface WorkspaceNavModel {
  scheduled: WorkspaceNavNode[]
  unscheduled: WorkspaceNavNode[]
  categories: WorkspaceNavNode[]
}

export interface WorkspaceSelection {
  selectedNodeId: string | null
  selectedNode: WorkspaceNavNode | null
  selectedTimeblockId: string | null
  selectedCategoryId: WorkspaceCategoryId | null
}

export interface EventWorkspaceData {
  event: Event | undefined
  isLoading: boolean
  isFetching: boolean
  error: Error | null
  updateEvent: (updates: UpdateEvent) => Promise<Event>
  deleteEvent: () => Promise<boolean>
  timelineRows: TimelineTimeblock[]
  sectionRows: TimeblockWithItems[]
  navModel: WorkspaceNavModel
  refetchAll: () => Promise<void>
}
