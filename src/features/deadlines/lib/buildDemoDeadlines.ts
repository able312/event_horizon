import type { DemoDeadline } from "../types"

const MS_PER_DAY = 24 * 60 * 60 * 1000

export function buildDemoDeadlines(eventStartDate: Date): DemoDeadline[] {
  return [
    {
      label: "Confirm booking",
      timing: "18 days before event",
      date: new Date(eventStartDate.getTime() - 18 * MS_PER_DAY),
    },
    {
      label: "Confirm menu choices & dietary restrictions",
      timing: "14 days before event",
      date: new Date(eventStartDate.getTime() - 14 * MS_PER_DAY),
    },
    {
      label: "Final guest count",
      timing: "7 days before event",
      date: new Date(eventStartDate.getTime() - 7 * MS_PER_DAY),
    },
  ]
}
