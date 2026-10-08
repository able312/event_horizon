import { v } from "convex/values"

import { buildConversionImpact } from "../src/definitions/timeblocks/timeblock-conversion"
import { getSectionDefaultPrefill } from "../src/definitions/timeblocks/setupInstructionPrefill"
import { buildTimelineRows } from "../src/lib/timeblocks/buildTimelineRows"
import type { Doc, Id } from "./_generated/dataModel"
import { internalMutation, internalQuery, type QueryCtx } from "./_generated/server"
import { assertUpdates, requireDocument, toRecord } from "./lib/records"
import { nullable, timeblockSectionType, timeZone } from "./lib/validators"

const conversionType = v.union(v.literal("note"), v.literal("setup_instruction"), v.literal("food"), v.literal("beverage"))
const conversionArgs = { timeblockId: v.id("timeblocks"), toType: conversionType }

async function getChildren(ctx: QueryCtx, id: Id<"timeblocks">) {
  const foodItems = await ctx.db.query("foodItems").withIndex("by_timeblock", (q) => q.eq("timeblockId", id)).collect()
  const beverageLinks = await ctx.db.query("beverageItemTimeblocks").withIndex("by_timeblock", (q) => q.eq("timeblockId", id)).collect()
  return { foodItems, beverageLinks }
}

async function withItems(ctx: QueryCtx, doc: Doc<"timeblocks">) {
  const { foodItems, beverageLinks } = await getChildren(ctx, doc._id)
  const beverageItems = await Promise.all(beverageLinks.map(async (link) =>
    toRecord(await requireDocument(ctx, "beverageItems", link.beverageItemId))))
  return { ...toRecord(doc), foodItems: foodItems.map(toRecord), beverageItems }
}

function blankDetails(sectionType: Doc<"timeblocks">["sectionType"]) {
  return sectionType === "note" || sectionType === "setup_instruction" ? "" : null
}

// All operations stay internal until authenticated public functions are added.
export const create = internalMutation({
  args: {
    eventId: v.id("events"),
    sectionType: timeblockSectionType,
    title: v.optional(v.string()),
    time: v.optional(nullable(v.string())),
    details: v.optional(nullable(v.string())),
    prefill: v.optional(v.union(
      v.object({ mode: v.literal("blank") }),
      v.object({
        mode: v.literal("section_default"),
        sectionType: timeblockSectionType,
        overrides: v.optional(v.object({ title: v.optional(v.string()), details: v.optional(nullable(v.string())) })),
      }),
    )),
  },
  handler: async (ctx, values) => {
    await requireDocument(ctx, "events", values.eventId)
    const prefill = values.prefill?.mode === "section_default" ? values.prefill : null
    const defaults = prefill ? getSectionDefaultPrefill(prefill.sectionType) : null
    const overrides = prefill?.sectionType === values.sectionType ? prefill.overrides : null
    const id = await ctx.db.insert("timeblocks", {
      eventId: values.eventId,
      sectionType: values.sectionType,
      title: values.title ?? overrides?.title ?? defaults?.title ?? "",
      details: values.details ?? overrides?.details ?? defaults?.details ?? blankDetails(values.sectionType),
      time: values.time ?? null,
      assignedTo: null,
      createdAt: Date.now().toString(),
      updatedAt: null,
    })
    return toRecord(await requireDocument(ctx, "timeblocks", id))
  },
})

export const update = internalMutation({
  args: { id: v.id("timeblocks"), updates: v.object({
    title: v.optional(v.string()),
    time: v.optional(nullable(v.string())),
    details: v.optional(nullable(v.string())),
    assignedTo: v.optional(nullable(v.string())),
  }) },
  handler: async (ctx, { id, updates }) => {
    assertUpdates(updates)
    await requireDocument(ctx, "timeblocks", id)
    await ctx.db.patch("timeblocks", id, { ...updates, updatedAt: Date.now().toString() })
    return toRecord(await requireDocument(ctx, "timeblocks", id))
  },
})

export const getById = internalQuery({
  args: { id: v.id("timeblocks") },
  handler: async (ctx, { id }) => withItems(ctx, await requireDocument(ctx, "timeblocks", id)),
})

export const getByEventIdAndSectionType = internalQuery({
  args: { eventId: v.id("events"), sectionType: timeblockSectionType },
  handler: async (ctx, { eventId, sectionType }) => {
    const docs = await ctx.db.query("timeblocks")
      .withIndex("by_event_section", (q) => q.eq("eventId", eventId).eq("sectionType", sectionType)).collect()
    return Promise.all(docs.map((doc) => withItems(ctx, doc)))
  },
})

export const inspectConversion = internalQuery({
  args: conversionArgs,
  handler: async (ctx, { timeblockId, toType }) => {
    const current = await requireDocument(ctx, "timeblocks", timeblockId)
    const { foodItems, beverageLinks } = await getChildren(ctx, timeblockId)
    return buildConversionImpact({
      timeblockId, title: current.title, fromType: current.sectionType, toType,
      foodItemCount: foodItems.length, beverageAssignmentCount: beverageLinks.length,
    })
  },
})

export const convertSectionType = internalMutation({
  args: { ...conversionArgs, confirmDestructive: v.optional(v.boolean()) },
  handler: async (ctx, { timeblockId, toType, confirmDestructive }) => {
    const current = await requireDocument(ctx, "timeblocks", timeblockId)
    const { foodItems, beverageLinks } = await getChildren(ctx, timeblockId)
    // Recompute inside the write transaction; an earlier inspection can be stale.
    const impact = buildConversionImpact({
      timeblockId, title: current.title, fromType: current.sectionType, toType,
      foodItemCount: foodItems.length, beverageAssignmentCount: beverageLinks.length,
    })
    if (impact.requiresConfirmation && !confirmDestructive) {
      throw new Error("Destructive conversion requires confirmDestructive=true")
    }
    if (current.sectionType === "food") {
      for (const item of foodItems) await ctx.db.delete("foodItems", item._id)
    }
    if (current.sectionType === "beverage") {
      for (const link of beverageLinks) await ctx.db.delete("beverageItemTimeblocks", link._id)
    }
    await ctx.db.patch("timeblocks", timeblockId, {
      sectionType: toType,
      details: current.details ?? blankDetails(toType),
      updatedAt: Date.now().toString(),
    })
    return { timeblock: toRecord(await requireDocument(ctx, "timeblocks", timeblockId)), impact }
  },
})

export const remove = internalMutation({
  args: { id: v.id("timeblocks") },
  handler: async (ctx, { id }) => {
    await requireDocument(ctx, "timeblocks", id)
    const { foodItems, beverageLinks } = await getChildren(ctx, id)
    for (const item of foodItems) await ctx.db.delete("foodItems", item._id)
    for (const link of beverageLinks) await ctx.db.delete("beverageItemTimeblocks", link._id)
    await ctx.db.delete("timeblocks", id)
    return true
  },
})

export const getAllTimelineBlocks = internalQuery({
  args: { eventId: v.id("events"), timeZone },
  handler: async (ctx, { eventId, timeZone }) => {
    // Validate even when the event has no start/end dates.
    new Intl.DateTimeFormat("en-GB", { timeZone })
    const event = await requireDocument(ctx, "events", eventId)
    const docs = await ctx.db.query("timeblocks").withIndex("by_event_section", (q) => q.eq("eventId", eventId)).collect()
    const tournament = await ctx.db.query("tournamentDetails").withIndex("by_event", (q) => q.eq("eventId", eventId)).unique()
    const carts = await ctx.db.query("cartDetails").withIndex("by_event", (q) => q.eq("eventId", eventId)).unique()
    return buildTimelineRows({
      event: toRecord(event),
      persistedTimeblocks: await Promise.all(docs.map((doc) => withItems(ctx, doc))),
      rawTournamentDetails: tournament ? toRecord(tournament) : null,
      rawCartDetails: carts ? toRecord(carts) : null,
      timeZone,
    })
  },
})
