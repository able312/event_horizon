import type { Event, EventRequest } from "~/definitions/database"
import { getCurrentMonthParam } from "~/lib/months"

import { parseRequestDate } from "./eventRequestPrefill"

/** The days a request asks for, as local dates; null when not given or unreadable. */
export type RequestCalendarDates = {
  preferred: Date | null
  alternate: Date | null
}

export function getRequestCalendarDates(
  request: Pick<EventRequest, "preferredDate" | "alternateDate">,
): RequestCalendarDates {
  return {
    preferred: request.preferredDate ? parseRequestDate(request.preferredDate) : null,
    alternate: request.alternateDate ? parseRequestDate(request.alternateDate) : null,
  }
}

/** The month to open on: the preferred date's, then the alternate's, then the current month. */
export function getRequestCalendarMonth(dates: RequestCalendarDates, now: Date = new Date()): string {
  return getCurrentMonthParam(dates.preferred ?? dates.alternate ?? now)
}

/** Lost events don't hold a date, so they don't count against availability. */
export function getBookedEvents(events: Event[]): Event[] {
  return events.filter((event) => event.status !== "lost")
}
