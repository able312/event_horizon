import { ConvexError, v } from "convex/values"
import { api, internal } from "./_generated/api"
import type { Doc, Id } from "./_generated/dataModel"
import { internalMutation, internalQuery, type QueryCtx } from "./_generated/server"
import { companyAction, companyQuery } from "./lib/auth"
import { deleteGoogleCalendarEvent, findGoogleCalendarEventUrl, googleEventIdFor, isGoogleCalendarConfigured, readGoogleCalendarConfig, saveGoogleCalendarEvent } from "./lib/googleCalendar"
import { requireDocument } from "./lib/records"
import { primaryClientOf } from "./eventContacts"
import { buildGoogleCalendarEventBody, googleCalendarBodyFingerprint, type GoogleCalendarEventBody, type GoogleCalendarSyncStatus } from "../src/features/google-calendar/lib/googleCalendar"

/** eventUrl is on calendar.google.com, the only Google Calendar origin the desktop app opens. */
export type GoogleCalendarEventLink = { eventUrl: string }
/** deletedFromGoogle is false when the linked Google event was already gone. */
export type GoogleCalendarRemoveResult = { deletedFromGoogle: boolean }

/** The Google Calendar body for the event as it is now; null until it has a start and end. */
async function currentBody(ctx: QueryCtx, event: Doc<"events">): Promise<GoogleCalendarEventBody | null> {
  if (!event.startDateTime || !event.endDateTime) return null
  const touchpoints = await ctx.db.query("touchpoints").withIndex("by_event", q => q.eq("eventId", event._id)).collect()
  return buildGoogleCalendarEventBody(event, {
    incompleteTouchpoints: touchpoints.filter(t => t.completedAt === null).map(({ title, dueDate }) => ({ title, dueDate })),
    client: await primaryClientOf(ctx, event._id),
  })
}

function lastSync(ctx: QueryCtx, eventId: Id<"events">) {
  return ctx.db.query("googleCalendarSyncs").withIndex("by_event", q => q.eq("eventId", eventId)).unique()
}

/**
 * Whether the linked Google event has the event's latest details. Live, so the card
 * changes as soon as anything that goes into the Google event (title, dates, notes,
 * guests, status, client, open touchpoints) is edited. Edits made in Google aren't seen.
 */
export const getSyncStatus = companyQuery({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }): Promise<GoogleCalendarSyncStatus> => {
    const event = await requireDocument(ctx, "events", eventId)
    const linked = event.calendarId?.trim()
    if (!linked) return "not_linked"
    const [body, synced] = await Promise.all([currentBody(ctx, event), lastSync(ctx, eventId)])
    if (!body || !synced || synced.calendarId !== linked) return "unknown"
    return synced.fingerprint === googleCalendarBodyFingerprint(body) ? "synced" : "out_of_date"
  },
})

/** What pushEvent sends: the event's link and its body as it is now. */
export const getPushContent = internalQuery({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const event = await requireDocument(ctx, "events", eventId)
    return { calendarId: event.calendarId, body: await currentBody(ctx, event) }
  },
})

/** Records what was just sent to the Google event linked as `calendarId`. */
export const recordSync = internalMutation({
  args: { eventId: v.id("events"), calendarId: v.string(), fingerprint: v.string() },
  handler: async (ctx, { eventId, calendarId, fingerprint }) => {
    const sync = { eventId, calendarId, fingerprint, syncedAt: new Date().toISOString() }
    const existing = await lastSync(ctx, eventId)
    if (existing) await ctx.db.patch("googleCalendarSyncs", existing._id, sync)
    else await ctx.db.insert("googleCalendarSyncs", sync)
  },
})

/**
 * Adds the event to the shared Google Calendar, or updates the Google event it's linked
 * to, as the Clubhouse account (lib/googleCalendar.ts). The link is saved with
 * events.update, so it runs as the signed-in caller, then what was sent is recorded
 * for getSyncStatus.
 */
export const pushEvent = companyAction({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }): Promise<GoogleCalendarEventLink> => {
    const config = readGoogleCalendarConfig()
    const { calendarId, body } = await ctx.runQuery(internal.googleCalendar.getPushContent, { eventId })
    if (!body) {
      throw new ConvexError({ code: "MissingDates", message: "Set both start and end date/time to add the event to Google Calendar." })
    }

    const saved = await saveGoogleCalendarEvent(config, {
      linkedCalendarId: calendarId,
      newEventId: googleEventIdFor(eventId),
      body,
    })
    if (saved.iCalUID !== calendarId) {
      await ctx.runMutation(api.events.update, { id: eventId, updates: { calendarId: saved.iCalUID } })
    }
    await ctx.runMutation(internal.googleCalendar.recordSync, {
      eventId,
      calendarId: saved.iCalUID,
      fingerprint: googleCalendarBodyFingerprint(body),
    })
    return { eventUrl: saved.eventUrl }
  },
})

/** Finds the linked Google event's link, so it can be opened without pushing the event again. */
export const getEventUrl = companyAction({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }): Promise<GoogleCalendarEventLink> => {
    const event = await ctx.runQuery(api.events.getById, { id: eventId })
    const linked = event.calendarId?.trim()
    if (!linked) throw new ConvexError({ code: "NotLinked", message: "This event isn't on Google Calendar yet." })
    return { eventUrl: await findGoogleCalendarEventUrl(readGoogleCalendarConfig(), linked) }
  },
})

/**
 * Deletes the linked Google event from the shared calendar, then clears the link.
 * The link is cleared even when the Google event was already gone.
 */
export const removeEvent = companyAction({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }): Promise<GoogleCalendarRemoveResult> => {
    const event = await ctx.runQuery(api.events.getById, { id: eventId })
    const linked = event.calendarId?.trim()
    if (!linked) return { deletedFromGoogle: false }

    const deletedFromGoogle = await deleteGoogleCalendarEvent(readGoogleCalendarConfig(), linked)
    await ctx.runMutation(api.events.update, { id: eventId, updates: { calendarId: null } })
    return { deletedFromGoogle }
  },
})

/**
 * Deletes the event from Event Horizon, first deleting its linked Google event so it
 * isn't left on the shared calendar. If Google refuses, the event is kept and the
 * refusal is shown. Deployments without Google Calendar set up skip that step, since
 * they can't reach the calendar and would otherwise never be able to delete linked events.
 */
export const deleteEvent = companyAction({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }): Promise<boolean> => {
    const event = await ctx.runQuery(api.events.getById, { id: eventId })
    const linked = event.calendarId?.trim()
    if (linked && isGoogleCalendarConfigured()) {
      await deleteGoogleCalendarEvent(readGoogleCalendarConfig(), linked)
    }
    return await ctx.runMutation(api.events.remove, { id: eventId })
  },
})
