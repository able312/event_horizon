import { ConvexError, v } from "convex/values"
import { api } from "./_generated/api"
import { companyAction } from "./lib/auth"
import { googleEventIdFor, readGoogleCalendarConfig, saveGoogleCalendarEvent } from "./lib/googleCalendar"
import { buildGoogleCalendarEventBody } from "../src/lib/googleCalendar"

export type GoogleCalendarPushResult = { eventUrl: string }

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
