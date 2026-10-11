import { describe, expect, it } from "vitest"

import {
  contactKeys,
  eventContactKeys,
  eventKeys,
  timeblockKeys,
  touchpointKeys,
} from "./queries"

/** Invalidating a prefix key covers every key that starts with it. */
function startsWith(key: readonly unknown[], prefix: readonly unknown[]) {
  return prefix.every((part, index) => Object.is(key[index], part))
}

const searchParams = {
  query: "smith",
  type: null,
  status: null,
  startFrom: null,
  startTo: null,
  page: 0,
  pageSize: 50,
}

const contactSearchParams = { query: "al", role: null, includeArchived: false, limit: 20 }

describe("query key hierarchy", () => {
  it("nests each month list under the months prefix", () => {
    expect(startsWith(eventKeys.month("2026-04"), eventKeys.months())).toBe(true)
    expect(startsWith(eventKeys.unscheduled(), eventKeys.months())).toBe(false)
  })

  it("nests each search page under the searches prefix", () => {
    expect(startsWith(eventKeys.search(searchParams), eventKeys.searches())).toBe(true)
  })

  it("nests panels and primary-client batches under the event-contacts root, so a full invalidation covers both", () => {
    expect(startsWith(eventContactKeys.panel("event-1"), eventContactKeys.all())).toBe(true)
    expect(startsWith(eventContactKeys.primaryClients(), eventContactKeys.all())).toBe(true)
    expect(startsWith(eventContactKeys.primaryClientsFor(["a", "b"]), eventContactKeys.primaryClients())).toBe(true)
  })

  it("nests every directory read under the contacts root", () => {
    for (const key of [
      contactKeys.search(contactSearchParams),
      contactKeys.directory(contactSearchParams),
      contactKeys.byId("c-1"),
      contactKeys.roles("c-1"),
      contactKeys.history("c-1"),
    ]) {
      expect(startsWith(key, contactKeys.all())).toBe(true)
    }
  })

  it("keeps an event's touchpoints separate from the incomplete list", () => {
    expect(touchpointKeys.byEvent("event-1")).not.toEqual(touchpointKeys.incomplete())
  })
})

describe("timeblockKeys.section", () => {
  it("maps section types that have a section list to that list's key", () => {
    expect(timeblockKeys.section("note", "event-1")).toEqual(timeblockKeys.notes("event-1"))
    expect(timeblockKeys.section("setup_instruction", "event-1")).toEqual(timeblockKeys.setupInstructions("event-1"))
    expect(timeblockKeys.section("food", "event-1")).toEqual(timeblockKeys.foodSection("event-1"))
    expect(timeblockKeys.section("beverage", "event-1")).toEqual(timeblockKeys.beverageSection("event-1"))
  })

  it("returns null for section types without a section list", () => {
    expect(timeblockKeys.section("tournament_detail", "event-1")).toBeNull()
    expect(timeblockKeys.section("cart_detail", "event-1")).toBeNull()
  })
})
