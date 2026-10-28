import { cronJobs } from "convex/server"

import { internal } from "./_generated/api"

const crons = cronJobs()

// Weekly is enough: new or corrected holidays can take up to a week to appear.
crons.weekly(
  "refresh Canadian holidays",
  { dayOfWeek: "monday", hourUTC: 9, minuteUTC: 0 },
  internal.holidays.refresh,
)

export default crons
