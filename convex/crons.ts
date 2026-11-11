import { cronJobs } from "convex/server"

import { internal } from "./_generated/api"

const crons = cronJobs()

// Weekly is enough: new or corrected holidays can take up to a week to appear.
crons.weekly(
  "refresh Canadian holidays",
  { dayOfWeek: "monday", hourUTC: 9, minuteUTC: 0 },
  internal.holidays.refresh,
)

// Inbox updates older than the retention window (src/lib/events/eventChangeNotifications.ts)
crons.daily(
  "prune old event notifications",
  { hourUTC: 8, minuteUTC: 0 },
  internal.eventNotifications.pruneOld,
)

export default crons
