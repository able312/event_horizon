import { describe, expect, it } from "vitest"

import { SECTION_TYPE } from "~/definitions/timeblocks/timeblock-constants"
import type { WorkspaceNavModel } from "../types"
import {
  buildEventDetailNavigationPath,
  getCanonicalEventDetailPath,
  parseEventDetailRoute,
  resolveSelectedNodeId,
  sectionFromNodeId,
  toEventDetailPath,
} from "./eventDetailRouteState"

function buildNavModel(overrides?: Partial<WorkspaceNavModel>): WorkspaceNavModel {
  return {
    scheduled: [
      {
        id: "scheduled:food",
        groupId: "scheduled",
        nodeType: "timeblock",
        label: "Lunch",
        sectionType: SECTION_TYPE.FOOD,
        sourceRef: { kind: "timeblock", timeblockId: "tb-food" },
      },
      {
        id: "scheduled:tournament",
        groupId: "scheduled",
        nodeType: "timeblock",
        label: "Bracket",
        sectionType: SECTION_TYPE.TOURNAMENT_DETAIL,
        sourceRef: { kind: "timeblock", timeblockId: "tb-tournament" },
      },
      {
        id: "system:start",
        groupId: "scheduled",
        nodeType: "system",
        label: "Event Start",
        sourceRef: { kind: "system", source: "event_start", syntheticId: "system-start" },
      },
    ],
    unscheduled: [
      {
        id: "unscheduled:note",
        groupId: "unscheduled",
        nodeType: "timeblock",
        label: "Reminder",
        sectionType: SECTION_TYPE.NOTE,
        sourceRef: { kind: "timeblock", timeblockId: "tb-note" },
      },
    ],
    categories: [
      {
        id: "category:food",
        groupId: "categories",
        nodeType: "category",
        label: "Food",
        sourceRef: { kind: "category", categoryId: "food" },
      },
      {
        id: "category:notes",
        groupId: "categories",
        nodeType: "category",
        label: "Notes",
        sourceRef: { kind: "category", categoryId: "notes" },
      },
      {
        id: "category:tournament",
        groupId: "categories",
        nodeType: "category",
        label: "Tournament",
        sourceRef: { kind: "category", categoryId: "tournament" },
      },
      {
        id: "category:financial",
        groupId: "categories",
        nodeType: "financial",
        label: "Financial",
        sourceRef: { kind: "financial", view: "overview" },
      },
    ],
    ...overrides,
  }
}

describe("eventDetailRouteState", () => {
  it("normalizes timeblock selections to category node ids", () => {
    const navModel = buildNavModel()

    expect(resolveSelectedNodeId("scheduled:food", navModel, [...navModel.scheduled, ...navModel.unscheduled, ...navModel.categories])).toBe(
      "category:food",
    )
    expect(resolveSelectedNodeId("unscheduled:note", navModel, [...navModel.scheduled, ...navModel.unscheduled, ...navModel.categories])).toBe(
      "category:notes",
    )
  })

  it("derives section from node ids", () => {
    const navModel = buildNavModel()
    const allNodes = [...navModel.scheduled, ...navModel.unscheduled, ...navModel.categories]

    expect(sectionFromNodeId("category:food", allNodes)).toBe("food")
    expect(sectionFromNodeId("system:start", allNodes)).toBe("system")
    expect(sectionFromNodeId("scheduled:food", allNodes)).toBe("food")
  })

  it("builds canonical paths without redundant node params", () => {
    const navModel = buildNavModel()

    expect(
      toEventDetailPath({
        eventId: "evt_1",
        selectedNodeId: "category:food",
        navModel,
      }),
    ).toBe("/events/evt_1/food")
  })

  it("includes node query for system selections", () => {
    const navModel = buildNavModel()

    expect(
      toEventDetailPath({
        eventId: "evt_1",
        selectedNodeId: "system:start",
        navModel,
      }),
    ).toBe("/events/evt_1/system?node=system%3Astart")
  })

  it("includes returnTo when not default", () => {
    const navModel = buildNavModel()

    expect(
      toEventDetailPath({
        eventId: "evt_1",
        selectedNodeId: "category:food",
        navModel,
        returnTo: "/events?date=2026-04",
      }),
    ).toBe("/events/evt_1/food?returnTo=%2Fevents%3Fdate%3D2026-04")
  })

  it("parses section routes into selected node ids", () => {
    const navModel = buildNavModel()

    expect(
      parseEventDetailRoute({ id: "evt_1", section: "food" }, new URLSearchParams(), navModel),
    ).toEqual({
      selectedNodeId: "category:food",
      returnTo: "/events",
    })
  })

  it("parses explicit node query params", () => {
    const navModel = buildNavModel()

    expect(
      parseEventDetailRoute(
        { id: "evt_1", section: "system" },
        new URLSearchParams("node=system%3Astart"),
        navModel,
      ),
    ).toEqual({
      selectedNodeId: "system:start",
      returnTo: "/events",
    })
  })

  it("defaults to the first normalized node when route is incomplete", () => {
    const navModel = buildNavModel()

    expect(parseEventDetailRoute({ id: "evt_1" }, new URLSearchParams(), navModel)).toEqual({
      selectedNodeId: "category:food",
      returnTo: "/events",
    })
  })

  it("returns a canonical redirect path when URL is non-canonical", () => {
    const navModel = buildNavModel()

    expect(
      getCanonicalEventDetailPath({
        eventId: "evt_1",
        params: { id: "evt_1" },
        searchParams: new URLSearchParams(),
        navModel,
      }),
    ).toBe("/events/evt_1/food")
  })

  it("builds navigation paths for calendar entry points", () => {
    const navModel = buildNavModel()

    expect(buildEventDetailNavigationPath("evt_1", navModel, "/events?date=2026-04")).toBe(
      "/events/evt_1/food?returnTo=%2Fevents%3Fdate%3D2026-04",
    )
  })

  it("falls back to raw timeblock id when mapped category is missing", () => {
    const navModel = buildNavModel({
      categories: [
        {
          id: "category:food",
          groupId: "categories",
          nodeType: "category",
          label: "Food",
          sourceRef: { kind: "category", categoryId: "food" },
        },
      ],
    })

    expect(
      toEventDetailPath({
        eventId: "evt_1",
        selectedNodeId: "scheduled:tournament",
        navModel,
      }),
    ).toBe("/events/evt_1/tournament?node=scheduled%3Atournament")
  })
})
