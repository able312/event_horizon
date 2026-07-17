import { useMemo } from "react"
import { Plus } from "lucide-react"

import { buildDemoDeadlines } from "../lib/buildDemoDeadlines"
import { DeadlineRow } from "./DeadlineRow"

export const DeadlinesCard: React.FC<{ eventStartDate: Date }> = ({ eventStartDate }) => {
  const deadlines = useMemo(
    () => buildDemoDeadlines(eventStartDate),
    [eventStartDate]
  )

  return (
    <section className="rounded-xs border border-border bg-background p-3 shadow-sm">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div>
          <h3 className="text-sm font-semibold tracking-wide">Deadlines</h3>
          <p className="text-xs text-muted-foreground">
            Simple deadlines based on the event start date. No database integration.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <Plus size={14} />
          Add Deadline
        </button>
      </div>

      <ul className="mt-1 divide-y divide-border">
        {deadlines.map((deadline) => (
          <DeadlineRow key={deadline.label} deadline={deadline} />
        ))}
      </ul>
    </section>
  )
}
