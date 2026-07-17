import type { LucideIcon } from "lucide-react"

export type DeadlineStatus = "standard" | "upcoming" | "due today" | "past due"

export interface DemoDeadline {
  label: string
  timing: string
  date: Date
}

export interface StatusStyle {
  Icon: LucideIcon
  iconClassName: string
  rowClassName: string
  labelClassName: string
  badge?: {
    text: string
    className: string
  }
}
