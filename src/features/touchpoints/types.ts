import type { LucideIcon } from "lucide-react"

export type { CommonTouchpointTemplate } from "~/lib/touchpoints/buildCommonTouchpoints"

export type TouchpointUrgency = "standard" | "upcoming" | "due today" | "past due"

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

/** Local draft row before first successful save. */
export interface TouchpointDraft {
  clientId: string
  title: string
  dueDate: string | null
  isDraft: true
}

export type TouchpointPlainItem = {
  title: string
  dueDate: string | null
}
