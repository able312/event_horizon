import { useMemo } from "react"

import { getDeadlineStatus, STATUS_STYLES } from "../lib/deadlineStatus"
import type { DemoDeadline } from "../types"

export const DeadlineRow: React.FC<{ deadline: DemoDeadline }> = ({ deadline }) => {
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
