import { describe, expect, it } from "vitest"

import { SECTION_TYPE } from "~/definitions/timeblocks/timeblock-constants"
import type { WorkspaceNavModel } from "../types"
import {
  buildEventDetailNavigationPath,
  getCanonicalEventDetailPath,
  isNavNodeSelected,
  parseEventDetailRoute,
  resolveSelectedNodeId,
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
        id: "scheduled:fake_timeblock_id_start",
        groupId: "scheduled",
        nodeType: "system",
        label: "Event Start",
        sourceRef: { kind: "system", source: "event_start", syntheticId: "fake_timeblock_id_start" },
      },
      {
        id: "scheduled:note",
        groupId: "scheduled",
        nodeType: "timeblock",
        label: "Doors",
        sectionType: SECTION_TYPE.NOTE,
        sourceRef: { kind: "timeblock", timeblockId: "tb-note-scheduled" },
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
      {
        id: "unscheduled:setup",
        groupId: "unscheduled",
        nodeType: "timeblock",
        label: "Buffet Setup",
        sectionType: SECTION_TYPE.SETUP_INSTRUCTION,
        sourceRef: { kind: "timeblock", timeblockId: "tb-setup" },
      },
    ],
    categories: [
      {
        id: "category:overview",
        groupId: "categories",
        nodeType: "category",
        label: "Overview",
        sourceRef: { kind: "category", categoryId: "overview" },
      },
      {
        id: "category:food",
        groupId: "categories",
        nodeType: "category",
        label: "Food",
        sourceRef: { kind: "category", categoryId: "food" },
      },
      {
        id: "category:logistics",
        groupId: "categories",
        nodeType: "category",
        label: "Logistics",
        sourceRef: { kind: "category", categoryId: "logistics" },
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
  it("keeps note, setup, and food selections focused while remapping other aggregates", () => {
    const navModel = buildNavModel()
    const allNodes = [...navModel.scheduled, ...navModel.unscheduled, ...navModel.categories]

    expect(resolveSelectedNodeId("scheduled:food", navModel, allNodes)).toBe("scheduled:food")
    expect(resolveSelectedNodeId("unscheduled:note", navModel, allNodes)).toBe("unscheduled:note")
    expect(resolveSelectedNodeId("unscheduled:setup", navModel, allNodes)).toBe("unscheduled:setup")
    expect(resolveSelectedNodeId("scheduled:fake_timeblock_id_start", navModel, allNodes)).toBe(
      "category:overview",
    )
  })

  it("builds focused timeblock paths with stable timeblock ids", () => {
    const navModel = buildNavModel()

    expect(
      toEventDetailPath({
        eventId: "evt_1",
        selectedNodeId: "unscheduled:note",
        navModel,
      }),
    ).toBe("/events/evt_1/timeblock/tb-note")

    expect(
      toEventDetailPath({
        eventId: "evt_1",
        selectedNodeId: "scheduled:note",
        navModel,
      }),
    ).toBe("/events/evt_1/timeblock/tb-note-scheduled")

    expect(
      toEventDetailPath({
        eventId: "evt_1",
        selectedNodeId: "scheduled:food",
        navModel,
      }),
    ).toBe("/events/evt_1/timeblock/tb-food")

    expect(
      toEventDetailPath({
        eventId: "evt_1",
        selectedNodeId: "unscheduled:setup",
        navModel,
        returnTo: "/events?date=2026-04",
      }),
    ).toBe("/events/evt_1/timeblock/tb-setup?returnTo=%2Fevents%3Fdate%3D2026-04")
  })

  it("builds category paths without node query params", () => {
    const navModel = buildNavModel()

    expect(
      toEventDetailPath({
        eventId: "evt_1",
        selectedNodeId: "category:food",
        navModel,
      }),
    ).toBe("/events/evt_1/food")

    expect(
      toEventDetailPath({
        eventId: "evt_1",
        selectedNodeId: "scheduled:tournament",
        navModel,
      }),
    ).toBe("/events/evt_1/tournament")
  })

  it("parses note routes into selected timeblock identity", () => {
    const navModel = buildNavModel()

    expect(
      parseEventDetailRoute(
        { id: "evt_1", timeblockId: "tb-note" },
        new URLSearchParams(),
        navModel,
      ),
    ).toEqual({
      selectedNodeId: "unscheduled:note",
      selectedTimeblockId: "tb-note",
      selectedCategoryId: null,
      returnTo: "/events",
    })
  })

  it("parses section routes into category selections", () => {
    const navModel = buildNavModel()

    expect(
      parseEventDetailRoute({ id: "evt_1", section: "food" }, new URLSearchParams(), navModel),
    ).toEqual({
      selectedNodeId: "category:food",
      selectedTimeblockId: null,
      selectedCategoryId: "food",
      returnTo: "/events",
    })
  })

  it("canonicalizes incomplete and legacy routes to overview", () => {
    const navModel = buildNavModel()

    expect(
      getCanonicalEventDetailPath({
        eventId: "evt_1",
        params: { id: "evt_1" },
        searchParams: new URLSearchParams(),
        navModel,
      }),
    ).toBe("/events/evt_1/overview")

    expect(
      getCanonicalEventDetailPath({
        eventId: "evt_1",
        params: { id: "evt_1", section: "notes" },
        searchParams: new URLSearchParams(),
        navModel,
      }),
    ).toBe("/events/evt_1/overview")

    expect(
      getCanonicalEventDetailPath({
        eventId: "evt_1",
        params: { id: "evt_1", section: "system" },
        searchParams: new URLSearchParams("node=system%3Astart"),
        navModel,
      }),
    ).toBe("/events/evt_1/overview")
  })

  it("keeps unknown focused timeblock ids on the focused route for body-level not-found handling", () => {
    const navModel = buildNavModel()

    expect(
      getCanonicalEventDetailPath({
        eventId: "evt_1",
        params: { id: "evt_1", timeblockId: "deleted-id" },
        searchParams: new URLSearchParams(),
        navModel,
      }),
    ).toBeNull()

    expect(
      getCanonicalEventDetailPath({
        eventId: "evt_1",
        params: { id: "evt_1", timeblockId: "tb-note" },
        searchParams: new URLSearchParams(),
        navModel,
        pathname: "/events/evt_1/note/tb-note",
      }),
    ).toBe("/events/evt_1/timeblock/tb-note")
  })

  it("builds navigation paths for calendar entry points", () => {
    const navModel = buildNavModel()

    expect(buildEventDetailNavigationPath("evt_1", navModel, "/events?date=2026-04")).toBe(
      "/events/evt_1/overview?returnTo=%2Fevents%3Fdate%3D2026-04",
    )
  })

  it("matches selection by stable timeblock id across scheduled and unscheduled ids", () => {
    const unscheduled = {
      id: "unscheduled:tb-note",
      groupId: "unscheduled" as const,
      nodeType: "timeblock" as const,
      label: "Reminder",
      sectionType: SECTION_TYPE.NOTE,
      sourceRef: { kind: "timeblock" as const, timeblockId: "tb-note" },
    }
    const scheduled = {
      ...unscheduled,
      id: "scheduled:tb-note",
      groupId: "scheduled" as const,
    }

    expect(isNavNodeSelected(unscheduled, "unscheduled:tb-note", "tb-note")).toBe(true)
    expect(isNavNodeSelected(scheduled, "unscheduled:tb-note", "tb-note")).toBe(true)
    expect(isNavNodeSelected(unscheduled, "category:food", null)).toBe(false)
  })

  it("falls back to overview when a mapped category is missing", () => {
    const navModel = buildNavModel({
      categories: [
        {
          id: "category:food",
          groupId: "categories",
          nodeType: "category",
          label: "Food",
          sourceRef: { kind: "category", categoryId: "food" },
        },
        {
          id: "category:overview",
          groupId: "categories",
          nodeType: "category",
          label: "Overview",
          sourceRef: { kind: "category", categoryId: "overview" },
        },
      ],
    })

    expect(
      toEventDetailPath({
        eventId: "evt_1",
        selectedNodeId: "scheduled:tournament",
        navModel,
      }),
    ).toBe("/events/evt_1/overview")
  })
})
