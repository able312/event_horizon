import { v } from "convex/values"

import type { Id } from "./_generated/dataModel"
import { internalMutation, internalQuery, type QueryCtx } from "./_generated/server"
import { assertUpdates, requireDocument, toRecord } from "./lib/records"
import { beverageServiceStyle, beverageType, nullable } from "./lib/validators"

const editableFields = {
  name: v.optional(v.string()),
  quantity: v.optional(nullable(v.number())),
  type: v.optional(beverageType),
  serviceStyle: v.optional(nullable(beverageServiceStyle)),
  includes: v.optional(nullable(v.string())),
  unitPriceCents: v.optional(nullable(v.number())),
}
const createFields = {
  ...editableFields,
  eventId: v.id("events"),
  name: v.string(),
  type: beverageType,
}

async function requireBeverageTimeblock(ctx: QueryCtx, eventId: Id<"events">, timeblockId: Id<"timeblocks">) {
  const timeblock = await requireDocument(ctx, "timeblocks", timeblockId)
  if (timeblock.eventId !== eventId || timeblock.sectionType !== "beverage") {
    throw new Error("Timeblock is invalid for this event's beverage item")
  }
}

// Convex owns IDs. Renderer integration must replace optimistic UUIDs with the
// returned ID before sending edits or assignments; client IDs are not accepted.
export const create = internalMutation({
  args: createFields,
  handler: async (ctx, values) => {
    await requireDocument(ctx, "events", values.eventId)
    const id = await ctx.db.insert("beverageItems", {
      ...values,
      quantity: values.quantity ?? null,
      serviceStyle: values.serviceStyle ?? null,
      includes: values.includes ?? null,
      unitPriceCents: values.unitPriceCents ?? null,
    })
    return toRecord(await requireDocument(ctx, "beverageItems", id))
  },
})

export const createAssignedToTimeblock = internalMutation({
  args: { ...createFields, timeblockId: v.id("timeblocks") },
  handler: async (ctx, { timeblockId, ...values }) => {
    await requireDocument(ctx, "events", values.eventId)
    await requireBeverageTimeblock(ctx, values.eventId, timeblockId)
    const id = await ctx.db.insert("beverageItems", {
      ...values,
      quantity: values.quantity ?? null,
      serviceStyle: values.serviceStyle ?? null,
      includes: values.includes ?? null,
      unitPriceCents: values.unitPriceCents ?? null,
    })
    await ctx.db.insert("beverageItemTimeblocks", { beverageItemId: id, timeblockId })
    return { ...toRecord(await requireDocument(ctx, "beverageItems", id)), assignedTimeblockIds: [timeblockId] }
  },
})

export const update = internalMutation({
  args: { id: v.id("beverageItems"), updates: v.object(editableFields) },
  handler: async (ctx, { id, updates }) => {
    assertUpdates(updates)
    await requireDocument(ctx, "beverageItems", id)
    await ctx.db.patch("beverageItems", id, updates)
    return toRecord(await requireDocument(ctx, "beverageItems", id))
  },
})

export const remove = internalMutation({
  args: { id: v.id("beverageItems") },
  handler: async (ctx, { id }) => {
    await requireDocument(ctx, "beverageItems", id)
    const links = await ctx.db.query("beverageItemTimeblocks").withIndex("by_item", (q) => q.eq("beverageItemId", id)).collect()
    for (const link of links) await ctx.db.delete("beverageItemTimeblocks", link._id)
    await ctx.db.delete("beverageItems", id)
    return true
  },
})

export const setItemTimeblocks = internalMutation({
  args: { itemId: v.id("beverageItems"), timeblockIds: v.array(v.id("timeblocks")) },
  handler: async (ctx, { itemId, timeblockIds }) => {
    const item = await requireDocument(ctx, "beverageItems", itemId)
    if (new Set(timeblockIds).size !== timeblockIds.length) throw new Error("Duplicate timeblock IDs")
    for (const id of timeblockIds) await requireBeverageTimeblock(ctx, item.eventId, id)
    const links = await ctx.db.query("beverageItemTimeblocks").withIndex("by_item", (q) => q.eq("beverageItemId", itemId)).collect()
    for (const link of links) await ctx.db.delete("beverageItemTimeblocks", link._id)
    for (const timeblockId of timeblockIds) {
      await ctx.db.insert("beverageItemTimeblocks", { beverageItemId: itemId, timeblockId })
    }
    return { itemId, timeblockIds }
  },
})

export const getByEventId = internalQuery({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const timeblocks = await ctx.db.query("timeblocks")
      .withIndex("by_event_section", (q) => q.eq("eventId", eventId).eq("sectionType", "beverage")).collect()
    const docs = await ctx.db.query("beverageItems").withIndex("by_event", (q) => q.eq("eventId", eventId)).collect()
    const items = await Promise.all(docs.map(async (doc) => {
      const links = await ctx.db.query("beverageItemTimeblocks").withIndex("by_item", (q) => q.eq("beverageItemId", doc._id)).collect()
      return { ...toRecord(doc), assignedTimeblockIds: links.map((link) => link.timeblockId) }
    }))
    return { timeblocks: timeblocks.map(toRecord), items }
  },
})
