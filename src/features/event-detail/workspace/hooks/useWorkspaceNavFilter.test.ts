import { describe, expect, it } from "vitest"

import { filterWorkspaceNavNodes } from "./useWorkspaceNavFilter"
import type { WorkspaceNavNode } from "../types"

const nodes: WorkspaceNavNode[] = [
  {
    id: "scheduled:1",
    groupId: "scheduled",
    nodeType: "timeblock",
    label: "Doors Open",
    subLabel: "Note",
    time: "09:00",
    assignedTo: "Alex",
    sourceRef: { kind: "timeblock", timeblockId: "1" },
  },
  {
    id: "unscheduled:2",
    groupId: "unscheduled",
    nodeType: "timeblock",
    label: "Buffet Setup",
    subLabel: "Setup Instruction",
    assignedTo: "Jamie",
    sourceRef: { kind: "timeblock", timeblockId: "2" },
  },
  {
    id: "scheduled:3",
    groupId: "scheduled",
    nodeType: "timeblock",
    label: "Lunch",
    subLabel: "Food",
    time: "12:00",
    sourceRef: { kind: "timeblock", timeblockId: "3" },
  },
]

describe("filterWorkspaceNavNodes", () => {
  it("returns all nodes when the query is empty", () => {
    expect(filterWorkspaceNavNodes(nodes, "  ")).toHaveLength(3)
  })

  it("matches title, type label, time, and assignedTo", () => {
    expect(filterWorkspaceNavNodes(nodes, "doors").map((n) => n.id)).toEqual(["scheduled:1"])
    expect(filterWorkspaceNavNodes(nodes, "setup").map((n) => n.id)).toEqual(["unscheduled:2"])
    expect(filterWorkspaceNavNodes(nodes, "12:00").map((n) => n.id)).toEqual(["scheduled:3"])
    expect(filterWorkspaceNavNodes(nodes, "jamie").map((n) => n.id)).toEqual(["unscheduled:2"])
  })
})
