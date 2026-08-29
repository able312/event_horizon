import { describe, expect, it } from "vitest"

import { SECTION_TYPE } from "~/definitions/timeblocks/timeblock-constants"
import type { WorkspaceNavNode } from "../types"
import {
  buildCategoryNodeId,
  buildScheduledNodeId,
  buildUnscheduledNodeId,
  findNodeByTimeblockId,
  getAggregateCategoryIdForSectionType,
  getAvailableWorkspaceCategories,
  getNavigationTarget,
  getSectionTypeLabel,
  isIndividualNoteSectionType,
  isWorkspaceCategoryId,
  parseNodeId,
  WORKSPACE_CATEGORIES,
} from "./navPolicy"

function makeTimeblockNode(
  overrides: Partial<WorkspaceNavNode> & { timeblockId: string; sectionType: WorkspaceNavNode["sectionType"] },
): WorkspaceNavNode {
  const { timeblockId, ...rest } = overrides
  return {
    id: buildScheduledNodeId(timeblockId),
    groupId: "scheduled",
    nodeType: "timeblock",
    label: "Node",
    sourceRef: { kind: "timeblock", timeblockId },
    ...rest,
  }
}

describe("navPolicy", () => {
  it("exposes the icon-menu category registry without notes or setup", () => {
    expect(WORKSPACE_CATEGORIES.map((category) => category.id)).toEqual([
      "overview",
      "food",
      "beverage",
      "logistics",
      "tournament",
      "financial",
    ])
    expect(isWorkspaceCategoryId("notes")).toBe(false)
    expect(isWorkspaceCategoryId("setup")).toBe(false)
    expect(isWorkspaceCategoryId("food")).toBe(true)
  })

  it("filters tournament category by event type", () => {
    expect(getAvailableWorkspaceCategories("wedding").map((c) => c.id)).not.toContain("tournament")
    expect(getAvailableWorkspaceCategories("tournament").map((c) => c.id)).toContain("tournament")
  })

  it("labels section types for sidebar display", () => {
    expect(getSectionTypeLabel(SECTION_TYPE.NOTE)).toBe("Note")
    expect(getSectionTypeLabel(SECTION_TYPE.SETUP_INSTRUCTION)).toBe("Setup Instruction")
    expect(getSectionTypeLabel(SECTION_TYPE.CART_DETAIL)).toBe("Cart Details")
  })

  it("treats notes and setup as individual editors", () => {
    expect(isIndividualNoteSectionType(SECTION_TYPE.NOTE)).toBe(true)
    expect(isIndividualNoteSectionType(SECTION_TYPE.SETUP_INSTRUCTION)).toBe(true)
    expect(isIndividualNoteSectionType(SECTION_TYPE.FOOD)).toBe(false)
    expect(getAggregateCategoryIdForSectionType(SECTION_TYPE.NOTE)).toBeNull()
    expect(getAggregateCategoryIdForSectionType(SECTION_TYPE.CART_DETAIL)).toBe("tournament")
    expect(getAggregateCategoryIdForSectionType(SECTION_TYPE.VENDOR)).toBe("logistics")
  })

  it("routes navigation targets per section and system source", () => {
    expect(
      getNavigationTarget(
        makeTimeblockNode({ timeblockId: "n1", sectionType: SECTION_TYPE.NOTE }),
      ),
    ).toEqual({ kind: "individual-note", timeblockId: "n1" })

    expect(
      getNavigationTarget(
        makeTimeblockNode({ timeblockId: "f1", sectionType: SECTION_TYPE.FOOD }),
      ),
    ).toEqual({ kind: "category", categoryId: "food" })

    expect(
      getNavigationTarget(
        makeTimeblockNode({ timeblockId: "c1", sectionType: SECTION_TYPE.CART_DETAIL }),
      ),
    ).toEqual({ kind: "category", categoryId: "tournament" })

    expect(
      getNavigationTarget({
        id: buildScheduledNodeId("fake_start"),
        groupId: "scheduled",
        nodeType: "system",
        label: "Event Start",
        sourceRef: { kind: "system", source: "event_start", syntheticId: "fake_start" },
      }),
    ).toEqual({ kind: "category", categoryId: "overview" })

    expect(
      getNavigationTarget({
        id: buildScheduledNodeId("fake_cart"),
        groupId: "scheduled",
        nodeType: "system",
        label: "Cart Details",
        sourceRef: { kind: "system", source: "cart_detail", syntheticId: "fake_cart" },
      }),
    ).toEqual({ kind: "category", categoryId: "tournament" })
  })

  it("builds and parses stable node ids", () => {
    expect(buildScheduledNodeId("tb-1")).toBe("scheduled:tb-1")
    expect(buildUnscheduledNodeId("tb-1")).toBe("unscheduled:tb-1")
    expect(buildCategoryNodeId("food")).toBe("category:food")
    expect(parseNodeId("scheduled:tb-1")).toEqual({ kind: "scheduled", timeblockId: "tb-1" })
    expect(parseNodeId("category:food")).toEqual({ kind: "category", categoryId: "food" })
    expect(parseNodeId("category:notes")).toBeNull()
  })

  it("finds nodes by stable timeblock id across groups", () => {
    const navModel = {
      scheduled: [],
      unscheduled: [
        makeTimeblockNode({
          id: buildUnscheduledNodeId("tb-note"),
          groupId: "unscheduled",
          timeblockId: "tb-note",
          sectionType: SECTION_TYPE.NOTE,
        }),
      ],
      categories: [],
    }

    expect(findNodeByTimeblockId("tb-note", navModel)?.id).toBe("unscheduled:tb-note")
    expect(findNodeByTimeblockId("missing", navModel)).toBeNull()
  })
})
