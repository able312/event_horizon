import { ConvexError, v } from "convex/values"
import { api } from "./_generated/api"
import { companyAction } from "./lib/auth"
import { deleteGoogleCalendarEvent, googleEventIdFor, isGoogleCalendarConfigured, readGoogleCalendarConfig, saveGoogleCalendarEvent } from "./lib/googleCalendar"
import { buildGoogleCalendarEventBody } from "../src/lib/googleCalendar"

export type GoogleCalendarPushResult = { eventUrl: string }
/** deletedFromGoogle is false when the linked Google event was already gone. */
export type GoogleCalendarRemoveResult = { deletedFromGoogle: boolean }

/**
 * Adds the event to the shared Google Calendar, or updates the Google event it's linked
 * to, as the Clubhouse account (lib/googleCalendar.ts). Reads go through the public
 * queries and the link is saved with events.update, so they run as the signed-in caller.
 */
export const pushEvent = companyAction({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }): Promise<GoogleCalendarPushResult> => {
    const config = readGoogleCalendarConfig()
    const event = await ctx.runQuery(api.events.getById, { id: eventId })
    if (!event.startDateTime || !event.endDateTime) {
      throw new ConvexError({ code: "MissingDates", message: "Set both start and end date/time to add the event to Google Calendar." })
    }
    const [touchpoints, clients] = await Promise.all([
      ctx.runQuery(api.touchpoints.getIncompleteByEventId, { eventId }),
      ctx.runQuery(api.eventContacts.getPrimaryClients, { eventIds: [eventId] }),
    ])
    const body = buildGoogleCalendarEventBody(event, {
      incompleteTouchpoints: touchpoints.map(({ title, dueDate }) => ({ title, dueDate })),
      client: clients[eventId] ?? null,
    })

    const saved = await saveGoogleCalendarEvent(config, {
      linkedCalendarId: event.calendarId,
      newEventId: googleEventIdFor(eventId),
      body,
    })
    if (saved.iCalUID !== event.calendarId) {
      await ctx.runMutation(api.events.update, { id: eventId, updates: { calendarId: saved.iCalUID } })
    }
    return { eventUrl: saved.eventUrl }
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
