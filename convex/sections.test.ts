import { convexTest } from "convex-test"
import { describe, expect, it } from "vitest"

import { api } from "./_generated/api"
import { companyIdentity } from "./lib/testIdentity"
import schema from "./schema"

const modules = import.meta.glob("./**/*.{ts,js}")

async function setup() {
  const t = convexTest(schema, modules).withIdentity(companyIdentity)
  const insertEvent = (title: string) => t.run((ctx) => ctx.db.insert("events", {
    title, type: "function", status: "new_lead",
    startDateTime: "2026-10-25T02:00:00.000Z", endDateTime: null,
    minGuests: null, maxGuests: null, guestCountFinal: null,
    driveFolderId: null, calendarId: null, clientNotes: null, internalNotes: null,
    isInternal: 0, createdAt: "1790812800000", updatedAt: null,
  }))
  const eventId = await insertEvent("Dinner")
  const otherEventId = await insertEvent("Other")
  const missingEventId = await insertEvent("Deleted")
  await t.run((ctx) => ctx.db.delete("events", missingEventId))
  const food = await t.mutation(api.timeblocks.create, { eventId, sectionType: "food", title: "Dinner", time: "18:00" })
  const bar = await t.mutation(api.timeblocks.create, { eventId, sectionType: "beverage", title: "Bar", time: "17:00" })
  const otherBar = await t.mutation(api.timeblocks.create, { eventId: otherEventId, sectionType: "beverage" })
  return { t, eventId, otherEventId, missingEventId, food, bar, otherBar }
}

describe("food items", () => {
  it("uses nullable defaults, joins items, and isolates events", async () => {
    const { t, eventId, otherEventId, food } = await setup()
    const item = await t.mutation(api.foodItems.create, { timeblockId: food.id, name: "Steak" })
    expect(item).toMatchObject({ name: "Steak", quantity: null, serviceStyle: null, includes: null, unitPriceCents: null })
    expect(await t.query(api.foodItems.getByEventId, { eventId })).toEqual([{ ...food, foodItems: [item], items: [item] }])
    expect(await t.query(api.foodItems.getByEventId, { eventId: otherEventId })).toEqual([])
    expect(await t.query(api.timeblocks.getById, { id: food.id })).toEqual({ ...food, foodItems: [item], beverageItems: [] })
  })

  it("patches only supplied fields and reports missing records", async () => {
    const { t, food } = await setup()
    const item = await t.mutation(api.foodItems.create, { timeblockId: food.id, name: "Steak", quantity: 40 })
    expect(await t.mutation(api.foodItems.update, { id: item.id, updates: { quantity: null, serviceStyle: "Plated", includes: "GF", unitPriceCents: 4500 } }))
      .toEqual({ ...item, updatedAt: expect.any(String), quantity: null, serviceStyle: "Plated", includes: "GF", unitPriceCents: 4500 })
    expect(await t.mutation(api.foodItems.remove, { id: item.id })).toBe(true)
    await expect(t.mutation(api.foodItems.remove, { id: item.id })).rejects.toThrow("record not found")
    await expect(t.mutation(api.foodItems.update, { id: item.id, updates: { name: "Gone" } })).rejects.toThrow("record not found")
  })

  it("rejects non-food parents, deleted parents, empty patches, and untrusted fields", async () => {
    const { t, food, bar } = await setup()
    await expect(t.mutation(api.foodItems.create, { timeblockId: bar.id, name: "Invalid" })).rejects.toThrow("food timeblock")
    const item = await t.mutation(api.foodItems.create, { timeblockId: food.id, name: "Soup" })
    await expect(t.mutation(api.foodItems.update, { id: item.id, updates: {} })).rejects.toThrow("Updates are required")
    // @ts-expect-error Parent reassignment must fail runtime validation.
    await expect(t.mutation(api.foodItems.update, { id: item.id, updates: { timeblockId: bar.id } })).rejects.toThrow()
    // @ts-expect-error Unknown service styles must fail runtime validation.
    await expect(t.mutation(api.foodItems.update, { id: item.id, updates: { serviceStyle: "unknown" } })).rejects.toThrow()
    await t.mutation(api.timeblocks.remove, { id: food.id })
    await expect(t.mutation(api.foodItems.create, { timeblockId: food.id, name: "Orphan" })).rejects.toThrow("record not found")
  })
})

describe("beverage items", () => {
  it("creates unassigned and atomically assigned items, and joins both sides", async () => {
    const { t, eventId, otherEventId, bar } = await setup()
    const unassigned = await t.mutation(api.beverageItems.create, { eventId, name: "Beer", type: "Beer" })
    expect(unassigned).toMatchObject({ quantity: null, serviceStyle: null, includes: null, unitPriceCents: null })
    const assigned = await t.mutation(api.beverageItems.createAssignedToTimeblock, { eventId, timeblockId: bar.id, name: "Red", type: "Wine" })
    expect(assigned.assignedTimeblockIds).toEqual([bar.id])
    expect(await t.query(api.beverageItems.getByEventId, { eventId })).toEqual({ timeblocks: [bar], items: [{ ...unassigned, assignedTimeblockIds: [] }, assigned] })
    expect((await t.query(api.beverageItems.getByEventId, { eventId: otherEventId })).items).toEqual([])
    const { assignedTimeblockIds, ...record } = assigned
    void assignedTimeblockIds
    expect((await t.query(api.timeblocks.getById, { id: bar.id })).beverageItems).toEqual([record])
  })

  it("rejects invalid assignments without inserting or removing anything", async () => {
    const { t, eventId, missingEventId, food, bar, otherBar } = await setup()
    for (const timeblockId of [food.id, otherBar.id]) {
      await expect(t.mutation(api.beverageItems.createAssignedToTimeblock, { eventId, timeblockId, name: "Bad", type: "Wine" })).rejects.toThrow("invalid")
    }
    await expect(t.mutation(api.beverageItems.create, { eventId: missingEventId, name: "Orphan", type: "Wine" })).rejects.toThrow("record not found")
    expect(await t.run((ctx) => ctx.db.query("beverageItems").collect())).toEqual([])
    const item = await t.mutation(api.beverageItems.createAssignedToTimeblock, { eventId, timeblockId: bar.id, name: "Red", type: "Wine" })
    for (const timeblockIds of [[bar.id, otherBar.id], [food.id], [bar.id, bar.id]]) {
      await expect(t.mutation(api.beverageItems.setItemTimeblocks, { itemId: item.id, timeblockIds })).rejects.toThrow()
    }
    expect((await t.query(api.beverageItems.getByEventId, { eventId })).items).toEqual([item])
  })

  it("replaces assignments idempotently, clears them, and cascades item deletion", async () => {
    const { t, eventId, bar } = await setup()
    const secondBar = await t.mutation(api.timeblocks.create, { eventId, sectionType: "beverage" })
    const item = await t.mutation(api.beverageItems.createAssignedToTimeblock, { eventId, timeblockId: bar.id, name: "Red", type: "Wine" })
    const payload = { itemId: item.id, timeblockIds: [bar.id, secondBar.id] }
    expect(await t.mutation(api.beverageItems.setItemTimeblocks, payload)).toEqual(payload)
    await t.mutation(api.beverageItems.setItemTimeblocks, payload)
    expect(await t.run((ctx) => ctx.db.query("beverageItemTimeblocks").collect())).toHaveLength(2)
    await t.mutation(api.beverageItems.setItemTimeblocks, { itemId: item.id, timeblockIds: [] })
    expect(await t.run((ctx) => ctx.db.query("beverageItemTimeblocks").collect())).toEqual([])
    await t.mutation(api.beverageItems.setItemTimeblocks, payload)
    expect(await t.mutation(api.beverageItems.remove, { id: item.id })).toBe(true)
    expect(await t.run((ctx) => ctx.db.query("beverageItemTimeblocks").collect())).toEqual([])
    expect(await t.run((ctx) => ctx.db.query("timeblocks").collect())).toHaveLength(4)
    await expect(t.mutation(api.beverageItems.setItemTimeblocks, payload)).rejects.toThrow("record not found")
    await expect(t.mutation(api.beverageItems.remove, { id: item.id })).rejects.toThrow("record not found")
  })

  it("patches nullable fields and rejects empty patches, invalid enums, client IDs and reassignment", async () => {
    const { t, eventId, otherEventId } = await setup()
    const item = await t.mutation(api.beverageItems.create, { eventId, name: "Red", type: "Wine", quantity: 12 })
    expect(await t.mutation(api.beverageItems.update, { id: item.id, updates: { name: "White", quantity: null, type: "Special Orders", includes: "Dry" } }))
      .toEqual({ ...item, updatedAt: expect.any(String), name: "White", quantity: null, type: "Special Orders", includes: "Dry" })
    await expect(t.mutation(api.beverageItems.update, { id: item.id, updates: {} })).rejects.toThrow("Updates are required")
    // @ts-expect-error Parent reassignment must fail runtime validation.
    await expect(t.mutation(api.beverageItems.update, { id: item.id, updates: { eventId: otherEventId } })).rejects.toThrow()
    // @ts-expect-error Invalid beverage type must fail runtime validation.
    await expect(t.mutation(api.beverageItems.update, { id: item.id, updates: { type: "unknown" } })).rejects.toThrow()
    // @ts-expect-error Convex creates its own IDs.
    await expect(t.mutation(api.beverageItems.create, { eventId, id: "optimistic-uuid", name: "Beer", type: "Beer" })).rejects.toThrow()
    await t.mutation(api.beverageItems.remove, { id: item.id })
    await expect(t.mutation(api.beverageItems.update, { id: item.id, updates: { name: "Gone" } })).rejects.toThrow("record not found")
  })
})

describe("timeblocks", () => {
  it("keeps blank defaults and explicit prefills with override precedence", async () => {
    const { t, eventId } = await setup()
    expect(await t.mutation(api.timeblocks.create, { eventId, sectionType: "setup_instruction" }))
      .toMatchObject({ title: "", details: "", time: null, assignedTo: null, updatedAt: null })
    const prefill = { mode: "section_default" as const, sectionType: "setup_instruction" as const }
    expect(await t.mutation(api.timeblocks.create, { eventId, sectionType: "setup_instruction", prefill }))
      .toMatchObject({ title: "Setup", details: "Describe what needs to be done..." })
    expect(await t.mutation(api.timeblocks.create, { eventId, sectionType: "setup_instruction", prefill: { ...prefill, overrides: { title: "Flip", details: "Reset chairs" } } }))
      .toMatchObject({ title: "Flip", details: "Reset chairs" })
    expect(await t.mutation(api.timeblocks.create, { eventId, sectionType: "setup_instruction", title: "Explicit", details: "Explicit body", prefill: { ...prefill, overrides: { title: "Flip", details: "Reset chairs" } } }))
      .toMatchObject({ title: "Explicit", details: "Explicit body" })
    expect(await t.mutation(api.timeblocks.create, { eventId, sectionType: "tournament_detail" })).toMatchObject({ title: "", details: null })
  })

  it("isolates section queries and allows only editable fields with server timestamps", async () => {
    const { t, eventId, otherEventId, food, bar } = await setup()
    const updated = await t.mutation(api.timeblocks.update, { id: food.id, updates: { title: "Lunch", assignedTo: "Kitchen", time: null, details: "Notes" } })
    expect(updated).toMatchObject({ ...food, title: "Lunch", assignedTo: "Kitchen", time: null, details: "Notes", updatedAt: expect.any(String) })
    expect(Number(updated.updatedAt)).toBeGreaterThan(0)
    expect(await t.query(api.timeblocks.getByEventIdAndSectionType, { eventId, sectionType: "food" }))
      .toEqual([{ ...updated, foodItems: [], beverageItems: [] }])
    expect(await t.query(api.timeblocks.getByEventIdAndSectionType, { eventId: otherEventId, sectionType: "food" })).toEqual([])
    expect(await t.query(api.timeblocks.getById, { id: bar.id })).toEqual({ ...bar, foodItems: [], beverageItems: [] })
    await expect(t.mutation(api.timeblocks.update, { id: food.id, updates: {} })).rejects.toThrow("Updates are required")
    // @ts-expect-error Section type must go through the conversion operation.
    await expect(t.mutation(api.timeblocks.update, { id: food.id, updates: { sectionType: "note" } })).rejects.toThrow()
    // @ts-expect-error Creation time is immutable.
    await expect(t.mutation(api.timeblocks.update, { id: food.id, updates: { createdAt: "fake" } })).rejects.toThrow()
  })

  it("inspects read-only and checks fresh data before destructive food conversion", async () => {
    const { t, food } = await setup()
    expect((await t.query(api.timeblocks.inspectConversion, { timeblockId: food.id, toType: "note" })).requiresConfirmation).toBe(false)
    const item = await t.mutation(api.foodItems.create, { timeblockId: food.id, name: "Soup" })
    const impact = await t.query(api.timeblocks.inspectConversion, { timeblockId: food.id, toType: "note" })
    expect(impact).toMatchObject({ deletedItemCount: 1, requiresConfirmation: true })
    await expect(t.mutation(api.timeblocks.convertSectionType, { timeblockId: food.id, toType: "note" })).rejects.toThrow("confirmDestructive=true")
    expect((await t.query(api.timeblocks.getById, { id: food.id })).foodItems).toEqual([item])
    const result = await t.mutation(api.timeblocks.convertSectionType, { timeblockId: food.id, toType: "note", confirmDestructive: true })
    expect(result.impact).toEqual(impact)
    expect(result.timeblock).toMatchObject({ ...food, sectionType: "note", details: "", updatedAt: expect.any(String) })
    expect(await t.run((ctx) => ctx.db.query("foodItems").collect())).toEqual([])
  })

  it("converts beverage blocks by unlinking items while preserving other assignments", async () => {
    const { t, eventId, bar } = await setup()
    const second = await t.mutation(api.timeblocks.create, { eventId, sectionType: "beverage" })
    const item = await t.mutation(api.beverageItems.create, { eventId, name: "Red", type: "Wine" })
    await t.mutation(api.beverageItems.setItemTimeblocks, { itemId: item.id, timeblockIds: [bar.id, second.id] })
    await expect(t.mutation(api.timeblocks.convertSectionType, { timeblockId: bar.id, toType: "food" })).rejects.toThrow("confirmDestructive=true")
    const result = await t.mutation(api.timeblocks.convertSectionType, { timeblockId: bar.id, toType: "food", confirmDestructive: true })
    expect(result.impact).toMatchObject({ removedAssignmentCount: 1, deletedItemCount: 0 })
    expect((await t.query(api.beverageItems.getByEventId, { eventId })).items).toEqual([{ ...item, assignedTimeblockIds: [second.id] }])
  })

  it("allows lossless conversions and rejects same-type or unsupported conversions", async () => {
    const { t, eventId } = await setup()
    const note = await t.mutation(api.timeblocks.create, { eventId, sectionType: "note", title: "Notes", details: "Body", time: "19:00" })
    const converted = await t.mutation(api.timeblocks.convertSectionType, { timeblockId: note.id, toType: "beverage" })
    expect(converted.timeblock).toMatchObject({ ...note, sectionType: "beverage", updatedAt: expect.any(String) })
    expect(converted.impact.requiresConfirmation).toBe(false)
    await expect(t.query(api.timeblocks.inspectConversion, { timeblockId: note.id, toType: "beverage" })).rejects.toThrow("already type")
    const system = await t.mutation(api.timeblocks.create, { eventId, sectionType: "cart_detail" })
    await expect(t.mutation(api.timeblocks.convertSectionType, { timeblockId: system.id, toType: "note" })).rejects.toThrow("Unsupported conversion")
    // @ts-expect-error Specialized destinations are not convertible.
    await expect(t.mutation(api.timeblocks.convertSectionType, { timeblockId: note.id, toType: "tournament_detail" })).rejects.toThrow()
  })

  it("cascades food/link deletes, preserves beverage items, and rejects missing records", async () => {
    const { t, eventId, missingEventId, food, bar } = await setup()
    await expect(t.mutation(api.timeblocks.create, { eventId: missingEventId, sectionType: "note" })).rejects.toThrow("record not found")
    await t.mutation(api.foodItems.create, { timeblockId: food.id, name: "Soup" })
    const item = await t.mutation(api.beverageItems.createAssignedToTimeblock, { eventId, timeblockId: bar.id, name: "Red", type: "Wine" })
    await t.mutation(api.timeblocks.remove, { id: food.id })
    await t.mutation(api.timeblocks.remove, { id: bar.id })
    expect(await t.run((ctx) => ctx.db.query("foodItems").collect())).toEqual([])
    expect(await t.run((ctx) => ctx.db.query("beverageItemTimeblocks").collect())).toEqual([])
    expect((await t.query(api.beverageItems.getByEventId, { eventId })).items).toEqual([{ ...item, assignedTimeblockIds: [] }])
    await expect(t.query(api.timeblocks.getById, { id: food.id })).rejects.toThrow("record not found")
    await expect(t.mutation(api.timeblocks.update, { id: food.id, updates: { title: "Gone" } })).rejects.toThrow("record not found")
    await expect(t.mutation(api.timeblocks.remove, { id: food.id })).rejects.toThrow("record not found")
    await expect(t.mutation(api.timeblocks.convertSectionType, { timeblockId: food.id, toType: "note" })).rejects.toThrow("record not found")
  })
})

describe("timeline", () => {
  it("sorts persisted rows, joins items, omits invalid times and uses the client's time zone", async () => {
    const { t, eventId, food, bar } = await setup()
    const item = await t.mutation(api.foodItems.create, { timeblockId: food.id, name: "Soup" })
    const alpha = await t.mutation(api.timeblocks.create, { eventId, sectionType: "note", title: "Alpha", time: "17:00" })
    const anotherAlpha = await t.mutation(api.timeblocks.create, { eventId, sectionType: "note", title: "Alpha", time: "17:00" })
    for (const time of [null, "", "   ", "24:00", "9:00", "10:7"]) {
      await t.mutation(api.timeblocks.create, { eventId, sectionType: "note", time })
    }
    const args = { eventId, timeZone: "America/Toronto" }
    const rows = await t.query(api.timeblocks.getAllTimelineBlocks, args)
    expect(rows.map((row) => row.id)).toEqual([
      ...[alpha.id, anotherAlpha.id].sort((a, b) => a.localeCompare(b)), bar.id, food.id, "fake_timeblock_id_start",
    ])
    expect(rows.find((row) => row.id === food.id)?.foodItems).toEqual([item])
    expect(rows.at(-1)).toMatchObject({ time: "22:00", timelineMeta: { source: "event_start", isSystem: true, isEditable: false }, createdAt: "1790812800000" })
    const utc = await t.query(api.timeblocks.getAllTimelineBlocks, { eventId, timeZone: "UTC" })
    expect(utc[0]).toMatchObject({ time: "02:00", timelineMeta: { source: "event_start" } })
    expect(await t.query(api.timeblocks.getAllTimelineBlocks, args)).toEqual(rows)
  })

  it("adds tournament/cart system rows, wraps golf end times, and stays read-only", async () => {
    const { t, eventId } = await setup()
    await t.run((ctx) => ctx.db.patch("events", eventId, { type: "tournament", endDateTime: "bad-date" }))
    expect(await t.run((ctx) => ctx.db.query("cartDetails").collect())).toEqual([])
    await t.query(api.timeblocks.getAllTimelineBlocks, { eventId, timeZone: "UTC" })
    expect(await t.run((ctx) => ctx.db.query("cartDetails").collect())).toEqual([])
    const tournament = await t.mutation(api.tournamentDetails.ensureByEventId, { eventId })
    await t.mutation(api.tournamentDetails.update, { id: tournament.id, updates: { time: "23:00", paceOfPlay: "04:30", numberOfPlayers: 72 } })
    const carts = await t.mutation(api.cartDetails.ensureByEventId, { eventId })
    await t.mutation(api.cartDetails.update, { id: carts.id, updates: { time: "13:45", assignedTo: "Team", whatGoesOnCarts: "Signs" } })
    const rows = await t.query(api.timeblocks.getAllTimelineBlocks, { eventId, timeZone: "UTC" })
    expect(rows.filter((row) => row.timelineMeta.isSystem).map((row) => [row.timelineMeta.source, row.time])).toEqual([
      ["event_start", "02:00"], ["tournament_end", "03:30"], ["cart_detail", "13:45"], ["tournament_start", "23:00"],
    ])
    expect(rows.find((row) => row.timelineMeta.source === "tournament_start")?.details).toContain("72 Players")
    expect(rows.find((row) => row.timelineMeta.source === "cart_detail")).toMatchObject({ assignedTo: "Team", cartDetails: { whatGoesOnCarts: "Signs" } })
    await t.mutation(api.tournamentDetails.update, { id: tournament.id, updates: { paceOfPlay: "bad", time: "24:00" } })
    expect((await t.query(api.timeblocks.getAllTimelineBlocks, { eventId, timeZone: "UTC" })).some((row) => row.timelineMeta.source === "tournament_start")).toBe(false)
  })

  it("rejects missing parents and invalid zones even on unscheduled events", async () => {
    const { t, eventId, missingEventId } = await setup()
    await expect(t.query(api.timeblocks.getAllTimelineBlocks, { eventId: missingEventId, timeZone: "UTC" })).rejects.toThrow("record not found")
    await t.run((ctx) => ctx.db.patch("events", eventId, { startDateTime: null }))
    await expect(t.query(api.timeblocks.getAllTimelineBlocks, { eventId, timeZone: "invalid-zone" })).rejects.toThrow()
  })
})
