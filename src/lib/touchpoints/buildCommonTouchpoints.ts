export type CommonTouchpointTemplate = {
  title: string
  timing: string
  dueDate: Date
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

export function buildCommonTouchpoints(eventStartDate: Date): CommonTouchpointTemplate[] {
  return [
    {
      title: "Confirm booking",
      timing: "18 days before event",
      dueDate: new Date(eventStartDate.getTime() - 18 * MS_PER_DAY),
    },
    {
      title: "Confirm menu choices & dietary restrictions",
      timing: "14 days before event",
      dueDate: new Date(eventStartDate.getTime() - 14 * MS_PER_DAY),
    },
    {
      title: "Final guest count",
      timing: "7 days before event",
      dueDate: new Date(eventStartDate.getTime() - 7 * MS_PER_DAY),
    },
  ]
}

/** Local calendar date → ISO UTC midnight string for storage. */
export function toIsoDateOnly(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}T00:00:00.000Z`
}
