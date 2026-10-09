import { v } from "convex/values"

import { buildCommonTouchpoints, toIsoDateOnly } from "../src/lib/touchpoints/buildCommonTouchpoints"
import { companyMutation, companyQuery } from "./lib/auth"
import { assertUpdates, requireDocument, toRecord } from "./lib/records"
import { nullable, timeZone } from "./lib/validators"

const editableFields = {
  title: v.optional(v.string()),
  dueDate: v.optional(nullable(v.string())),
  completedAt: v.optional(nullable(v.string())),
}

// Public functions; every handler requires a company identity (lib/auth.ts).
export const getByEventId = companyQuery({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const docs = await ctx.db.query("touchpoints").withIndex("by_event", (q) => q.eq("eventId", eventId)).collect()
    return docs.map((doc) => toRecord(doc))
  },
})

export const getIncompleteByEventId = companyQuery({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const docs = await ctx.db.query("touchpoints").withIndex("by_event", (q) => q.eq("eventId", eventId)).collect()
    return docs.filter((doc) => doc.completedAt === null).map((doc) => toRecord(doc))
  },
})

export const getIncompleteWithEvent = companyQuery({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query("touchpoints").withIndex("by_completedAt", (q) => q.eq("completedAt", null)).collect()
    const results = await Promise.all(docs.map(async (doc) => {
      const event = await ctx.db.get("events", doc.eventId)
      return event ? { ...toRecord(doc), eventTitle: event.title } : null
    }))
    return results.filter((result) => result !== null)
  },
})

export const create = companyMutation({
  args: { eventId: v.id("events"), values: v.optional(v.object(editableFields)) },
  handler: async (ctx, { eventId, values }) => {
    await requireDocument(ctx, "events", eventId)
    const id = await ctx.db.insert("touchpoints", {
      eventId,
      title: values?.title ?? "",
      dueDate: values?.dueDate ?? null,
      completedAt: values?.completedAt ?? null,
      createdAt: new Date().toISOString(),
    })
    return toRecord(await requireDocument(ctx, "touchpoints", id))
  },
})

export const update = companyMutation({
  args: { id: v.id("touchpoints"), updates: v.object(editableFields) },
  handler: async (ctx, { id, updates }) => {
    assertUpdates(updates)
    await requireDocument(ctx, "touchpoints", id)
    await ctx.db.patch("touchpoints", id, updates)
    return toRecord(await requireDocument(ctx, "touchpoints", id))
  },
})

export const remove = companyMutation({
  args: { id: v.id("touchpoints") },
  handler: async (ctx, { id }) => {
    await requireDocument(ctx, "touchpoints", id)
    await ctx.db.delete("touchpoints", id)
    return true
  },
})

export const seedCommon = companyMutation({
  args: { eventId: v.id("events"), timeZone },
  handler: async (ctx, { eventId, timeZone }) => {
    const event = await requireDocument(ctx, "events", eventId)
    const eventStart = event.startDateTime ? new Date(event.startDateTime) : new Date()
    if (Number.isNaN(eventStart.getTime())) throw new Error("Invalid event startDateTime")
    const createdAt = new Date().toISOString()
    const results = []
    for (const template of buildCommonTouchpoints(eventStart)) {
      const id = await ctx.db.insert("touchpoints", {
        eventId,
        title: template.title,
        dueDate: toIsoDateOnly(template.dueDate, timeZone),
        completedAt: null,
        createdAt,
      })
      results.push(toRecord(await requireDocument(ctx, "touchpoints", id)))
    }
    return results
  },
})
