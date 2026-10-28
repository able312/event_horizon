import { ConvexError, v } from "convex/values"
import { api, internal } from "./_generated/api"
import type { Doc, Id } from "./_generated/dataModel"
import { internalQuery, type QueryCtx } from "./_generated/server"
import { companyAction, companyInternalMutation, companyQuery } from "./lib/auth"
import { deleteGoogleCalendarEvent, findGoogleCalendarEventUrl, googleEventIdFor, isGoogleCalendarConfigured, readGoogleCalendarConfig, saveGoogleCalendarEvent } from "./lib/googleCalendar"
import { requireDocument } from "./lib/records"
import { nullable } from "./lib/validators"
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

/**
 * Saves the link to the Google event that was just written and records what was sent to
 * it, in one transaction so getSyncStatus never sees one without the other. Refuses if
 * someone changed the link while the push was in flight, rather than overwriting theirs.
 */
export const recordPush = companyInternalMutation({
  args: { eventId: v.id("events"), sentToCalendarId: nullable(v.string()), calendarId: v.string(), fingerprint: v.string() },
  handler: async (ctx, { eventId, sentToCalendarId, calendarId, fingerprint }) => {
    const event = await requireDocument(ctx, "events", eventId)
    if ((event.calendarId?.trim() || null) !== (sentToCalendarId?.trim() || null)) {
      throw new ConvexError({
        code: "LinkChanged",
        message: "The linked Google Calendar event was changed while this update was being sent. Check the link and update again.",
      })
    }
    if (event.calendarId !== calendarId) {
      await ctx.db.patch("events", eventId, { calendarId, updatedAt: Date.now().toString() })
    }
    const sync = { eventId, calendarId, fingerprint, syncedAt: new Date().toISOString() }
    const existing = await lastSync(ctx, eventId)
    if (existing) await ctx.db.patch("googleCalendarSyncs", existing._id, sync)
    else await ctx.db.insert("googleCalendarSyncs", sync)
  },
})

/**
 * Clears the link to the Google event removeEvent just deleted. Keeps a different link
 * someone saved while the delete was in flight, since that Google event wasn't touched.
 */
export const recordRemoval = companyInternalMutation({
  args: { eventId: v.id("events"), removedCalendarId: v.string() },
  handler: async (ctx, { eventId, removedCalendarId }) => {
    const event = await requireDocument(ctx, "events", eventId)
    const linked = event.calendarId?.trim() || null
    if (!linked) return
    if (linked !== removedCalendarId.trim()) {
      throw new ConvexError({
        code: "LinkChanged",
        message: "Removed the previously linked Google Calendar event, but the link was changed while it was being removed. The new link was kept.",
      })
    }
    await ctx.db.patch("events", eventId, { calendarId: null, updatedAt: Date.now().toString() })
  },
})

/**
 * Adds the event to the shared Google Calendar, or updates the Google event it's linked
 * to, as the Clubhouse account (lib/googleCalendar.ts). Then saves the link and what was
 * sent for getSyncStatus, as the signed-in caller.
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
    await ctx.runMutation(internal.googleCalendar.recordPush, {
      eventId,
      sentToCalendarId: calendarId ?? null,
      calendarId: saved.link,
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
 * The link is cleared even when the Google event was already gone, unless someone
 * changed it in the meantime (recordRemoval).
 */
export const removeEvent = companyAction({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }): Promise<GoogleCalendarRemoveResult> => {
    const event = await ctx.runQuery(api.events.getById, { id: eventId })
    const linked = event.calendarId?.trim()
    if (!linked) return { deletedFromGoogle: false }

    const deletedFromGoogle = await deleteGoogleCalendarEvent(readGoogleCalendarConfig(), linked)
    await ctx.runMutation(internal.googleCalendar.recordRemoval, { eventId, removedCalendarId: linked })
    return { deletedFromGoogle }
  },
})

/**
 * Deletes the event from Event Horizon, first deleting its linked Google event so it
 * isn't left on the shared calendar. If Google refuses, the event is kept and the
 * refusal is shown. If the Google event goes but the event can't be deleted, deleting
 * again finishes the job, since a Google event that's already gone counts as deleted.
 * Deployments without Google Calendar set up skip that step, since they can't reach
 * the calendar and would otherwise never be able to delete linked events.
 */
export const deleteEvent = companyAction({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }): Promise<boolean> => {
    const event = await ctx.runQuery(api.events.getById, { id: eventId })
    const linked = event.calendarId?.trim()
    if (!linked || !isGoogleCalendarConfigured()) return await ctx.runMutation(api.events.remove, { id: eventId })

    await deleteGoogleCalendarEvent(readGoogleCalendarConfig(), linked)
    try {
      return await ctx.runMutation(api.events.remove, { id: eventId })
    } catch (error) {
      console.error("Deleted the Google event but not the event", error)
      throw new ConvexError({
        code: "DeletePartlyDone",
        message: "Removed from Google Calendar, but the event couldn't be deleted. Try deleting it again.",
      })
    }
  },
})
