import { useMemo } from "react"
import { AlertCircle, Circle, Plus, type LucideIcon } from "lucide-react"

type DeadlineStatus = "standard" | "upcoming" | "due today" | "past due"

interface DemoDeadline {
  label: string
  timing: string
  date: Date
}

interface StatusStyle {
  Icon: LucideIcon
  iconClassName: string
  rowClassName: string
  labelClassName: string
  badge?: {
    text: string
    className: string
  }
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function daysFromToday(deadlineDate: Date, now = new Date()): number {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round(
    (startOfDay(deadlineDate).getTime() - startOfDay(now).getTime()) / msPerDay
  )
}

function getDeadlineStatus(deadlineDate: Date): DeadlineStatus {
  const diff = daysFromToday(deadlineDate)
  if (diff < 0) return "past due"
  if (diff === 0) return "due today"
  if (diff <= 3) return "upcoming"
  return "standard"
}

const STATUS_STYLES: Record<DeadlineStatus, StatusStyle> = {
  standard: {
    Icon: Circle,
    iconClassName: "shrink-0 text-muted-foreground",
    rowClassName: "flex items-center gap-3 py-2.5",
    labelClassName: "text-sm font-medium",
  },
  upcoming: {
    Icon: Circle,
    iconClassName: "shrink-0 text-orange-500",
    rowClassName: "flex items-center gap-3 rounded-xs bg-orange-50/60 px-1 -mx-1 py-2.5",
    labelClassName: "text-sm font-medium",
    badge: {
      text: "Upcoming",
      className: "rounded-xs bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700",
    },
  },
  "due today": {
    Icon: AlertCircle,
    iconClassName: "shrink-0 text-orange-600",
    rowClassName: "flex items-center gap-3 rounded-xs bg-orange-100 px-2 -mx-2 py-2.5",
    labelClassName: "text-sm font-semibold text-orange-900",
    badge: {
      text: "Due today",
      className: "rounded-xs bg-orange-500 px-2 py-0.5 text-xs font-semibold text-white",
    },
  },
  "past due": {
    Icon: Circle,
    iconClassName: "shrink-0 text-muted-foreground/50",
    rowClassName: "flex items-center gap-3 py-2.5 opacity-80",
    labelClassName: "text-sm font-medium text-muted-foreground",
    badge: {
      text: "Past due",
      className: "rounded-xs bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground",
    },
  },
}

export const DeadlinesCard: React.FC<{ eventStartDate: Date }> = ({ eventStartDate }) => {
  const deadlines = useMemo(() => {
    return [
      {
        label: "Confirm booking",
        timing: "18 days before event",
        date: new Date(eventStartDate.getTime() - 18 * 24 * 60 * 60 * 1000),
      },
      {
        label: "Confirm menu choices & dietary restrictions",
        timing: "14 days before event",
        date: new Date(eventStartDate.getTime() - 14 * 24 * 60 * 60 * 1000),
      },
      {
        label: "Final guest count",
        timing: "7 days before event",
        date: new Date(eventStartDate.getTime() - 7 * 24 * 60 * 60 * 1000),
      },
    ]
  }, [eventStartDate])

  return (
    <section className="rounded-xs border border-border bg-background p-3 shadow-sm">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div>
          <h3 className="text-sm font-semibold tracking-wide">Deadlines</h3>
          <p className="text-xs text-muted-foreground">
            UI/UX placeholder for deadlines. Not wired to real data.
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

const DeadlineRow: React.FC<{ deadline: DemoDeadline }> = ({ deadline }) => {
  const status = useMemo(() => getDeadlineStatus(deadline.date), [deadline.date])
  const styles = STATUS_STYLES[status]
  const Icon = styles.Icon

  return (
    <li className={styles.rowClassName}>
      <Icon size={16} className={styles.iconClassName} />
      <div className="min-w-0 flex-1">
        <p className={styles.labelClassName}>{deadline.label}</p>
        <p className="text-xs text-muted-foreground">
          {deadline.timing} * {deadline.date.toLocaleDateString()}
        </p>
      </div>
      {styles.badge ? (
        <span className={styles.badge.className}>{styles.badge.text}</span>
      ) : null}
    </li>
  )
}
