import { ConvexError, v } from "convex/values"
import { api, internal } from "./_generated/api"
import type { Doc, Id } from "./_generated/dataModel"
import { internalQuery, type ActionCtx, type QueryCtx } from "./_generated/server"
import { companyAction, companyInternalMutation, companyQuery } from "./lib/auth"
import { deleteGoogleCalendarEvent, findGoogleCalendarEventUrl, googleEventIdFor, isGoogleCalendarConfigured, readGoogleCalendarConfig, saveGoogleCalendarEvent } from "./lib/googleCalendar"
import { requireDocument, type toRecord } from "./lib/records"
import { nullable } from "./lib/validators"
import { primaryClientOf } from "./eventContacts"
import { eventInput } from "./events"
import { buildGoogleCalendarEventBody, googleCalendarBodyFingerprint, type GoogleCalendarEventBody, type GoogleCalendarSyncStatus } from "../src/features/google-calendar/lib/googleCalendar"

/** eventUrl is on calendar.google.com, the only Google Calendar origin the desktop app opens. */
export type GoogleCalendarEventLink = { eventUrl: string }
/** deletedFromGoogle is false when the linked Google event was already gone. */
export type GoogleCalendarRemoveResult = { deletedFromGoogle: boolean }
type EventRecord = ReturnType<typeof toRecord<Doc<"events">>>

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
 * it, in one transaction so getSyncStatus never sees one without the other. Refuses if,
 * while the push was in flight, someone linked another Google event (rather than
 * overwriting their link), deleted the event or removed its date, so pushEvent can take
 * back a Google event it just created. A link already pointing at the pushed event, as
 * after two people add the event at once, is no conflict.
 */
export const recordPush = companyInternalMutation({
  args: { eventId: v.id("events"), sentToCalendarId: nullable(v.string()), calendarId: v.string(), fingerprint: v.string() },
  handler: async (ctx, { eventId, sentToCalendarId, calendarId, fingerprint }) => {
    const event = await ctx.db.get("events", eventId)
    if (!event) {
      throw new ConvexError({
        code: "EventDeleted",
        message: "The event was deleted while it was being sent to Google Calendar, so it was taken off Google Calendar again.",
      })
    }
    if (!event.startDateTime || !event.endDateTime) {
      throw new ConvexError({
        code: "DateRemoved",
        message: "The event's date was removed while it was being sent to Google Calendar, so it was taken off Google Calendar again.",
      })
    }
    const linked = event.calendarId?.trim() || null
    if (linked !== (sentToCalendarId?.trim() || null) && linked !== calendarId) {
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

type PushConflict = "EventDeleted" | "DateRemoved" | "LinkChanged"

const PUSH_CONFLICTS: Record<PushConflict, string> = {
  EventDeleted: "The event was deleted",
  DateRemoved: "The event's date was removed",
  LinkChanged: "Another Google Calendar event was linked",
}

function pushConflictOf(error: unknown): PushConflict | null {
  const code: unknown = error instanceof ConvexError ? error.data?.code : undefined
  return typeof code === "string" && code in PUSH_CONFLICTS ? (code as PushConflict) : null
}

/**
 * Deletes the Google event a first push just created when recordPush refused it, so it
 * isn't left on the shared calendar with nothing linking to it: the event was deleted or
 * its date removed (neither could delete a Google event they didn't know about yet), or
 * someone linked another Google event. Clears the link only if it still points there.
 * A push that updated an already-linked event isn't taken back for a new link, since that
 * Google event was there before; for the others it is, as its PATCH may have restored the
 * Google event the deletion or date removal had just deleted.
 */
async function takeBackPush(ctx: ActionCtx, eventId: Id<"events">, pushedLink: string, conflict: PushConflict, wasFirstPush: boolean): Promise<void> {
  if (conflict === "LinkChanged" && !wasFirstPush) return
  try {
    if (conflict === "DateRemoved") await removeLinkedGoogleEvent(ctx, eventId, pushedLink)
    else await deleteGoogleCalendarEvent(readGoogleCalendarConfig(), pushedLink)
  } catch (error) {
    if (pushConflictOf(error) === "LinkChanged") return
    const reason = error instanceof ConvexError && typeof error.data?.message === "string" ? ` ${error.data.message}` : ""
    throw new ConvexError({
      code: "PushNotTakenBack",
      message: `${PUSH_CONFLICTS[conflict]} while the event was being sent to Google Calendar, and the copy just sent couldn't be taken off again.${reason}`,
    })
  }
}

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
    try {
      await ctx.runMutation(internal.googleCalendar.recordPush, {
        eventId,
        sentToCalendarId: calendarId ?? null,
        calendarId: saved.link,
        fingerprint: googleCalendarBodyFingerprint(body),
      })
    } catch (error) {
      const conflict = pushConflictOf(error)
      if (conflict) await takeBackPush(ctx, eventId, saved.link, conflict, !calendarId?.trim())
      throw error
    }
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
 * Deletes the linked Google event, then clears the link (recordRemoval). False when the
 * Google event was already gone. Shared by removeEvent and updateEvent.
 */
async function removeLinkedGoogleEvent(ctx: ActionCtx, eventId: Id<"events">, linked: string): Promise<boolean> {
  const deletedFromGoogle = await deleteGoogleCalendarEvent(readGoogleCalendarConfig(), linked)
  await ctx.runMutation(internal.googleCalendar.recordRemoval, { eventId, removedCalendarId: linked })
  return deletedFromGoogle
}

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

    return { deletedFromGoogle: await removeLinkedGoogleEvent(ctx, eventId, linked) }
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
    if (!isGoogleCalendarConfigured()) return await ctx.runMutation(api.events.remove, { id: eventId })
    // A link saved meanwhile refuses the delete, so its Google event isn't left behind
    if (!linked) return await ctx.runMutation(api.events.remove, { id: eventId, expectedCalendarId: null })

    await deleteGoogleCalendarEvent(readGoogleCalendarConfig(), linked)
    try {
      return await ctx.runMutation(api.events.remove, { id: eventId, expectedCalendarId: linked })
    } catch (error) {
      if (error instanceof ConvexError && error.data?.code === "LinkChanged") {
        throw new ConvexError({
          code: "LinkChanged",
          message: "Removed the previously linked event from Google Calendar, but the link was changed while it was being removed, so the event and its new link were kept.",
        })
      }
      console.error("Deleted the Google event but not the event", error)
      throw new ConvexError({
        code: "DeletePartlyDone",
        message: "Removed from Google Calendar, but the event couldn't be deleted. Try deleting it again.",
      })
    }
  },
})

/**
 * Saves an event update. When it removes the event's date, the linked Google event is
 * deleted and the link cleared too, so the shared calendar doesn't keep showing an event
 * that no longer has a date; adding a date again lets it be pushed again. The update is
 * saved first so its own checks run before Google is touched. If Google then refuses,
 * the date stays removed and the link is kept so the event can be removed by hand.
 * Deployments without Google Calendar set up only save the update.
 */
export const updateEvent = companyAction({
  args: { id: v.id("events"), updates: eventInput },
  handler: async (ctx, { id, updates }): Promise<EventRecord> => {
    const updated = await ctx.runMutation(api.events.update, { id, updates })
    const linked = updated.calendarId?.trim()
    const removesDate = updates.startDateTime === null && updates.calendarId === undefined
    if (!removesDate || !linked || !isGoogleCalendarConfigured()) return updated

    try {
      await removeLinkedGoogleEvent(ctx, id, linked)
    } catch (error) {
      // The Google event was deleted; only someone else's new link was kept
      if (error instanceof ConvexError && error.data?.code === "LinkChanged") throw error
      const reason = error instanceof ConvexError && typeof error.data?.message === "string" ? ` ${error.data.message}` : ""
      throw new ConvexError({
        code: "DateRemovedGoogleKept",
        message: `The date was removed, but the event is still on Google Calendar.${reason}`,
      })
    }
    return await ctx.runQuery(api.events.getById, { id })
  },
})
