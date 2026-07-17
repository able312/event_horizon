import type { IncompleteTouchpointWithEvent } from "~/definitions/database"

import { getTouchpointUrgencyFromStored } from "./touchpointStatus"

export type SidebarTouchpointSectionKey = "due today" | "past due" | "upcoming"

export type SidebarTouchpointRow = IncompleteTouchpointWithEvent & {
  urgency: SidebarTouchpointSectionKey
}

export type SidebarTouchpointSection = {
  key: SidebarTouchpointSectionKey
  label: string
  cap: number
  items: SidebarTouchpointRow[]
}

const SECTION_ORDER: SidebarTouchpointSectionKey[] = ["due today", "past due", "upcoming"]
const SECTION_CAPS: Record<SidebarTouchpointSectionKey, number> = {
  "due today": 3,
  "past due": 5,
  upcoming: 5,
}
const SECTION_LABELS: Record<SidebarTouchpointSectionKey, string> = {
  "due today": "Due today",
  "past due": "Past due",
  upcoming: "Upcoming",
}

function sortByDueDateAsc(a: SidebarTouchpointRow, b: SidebarTouchpointRow): number {
  return (a.dueDate ?? "").localeCompare(b.dueDate ?? "")
}

/** Groups incomplete touchpoints for the calendar sidebar; omits farther-out standard rows. */
export function groupSidebarTouchpoints(
  rows: IncompleteTouchpointWithEvent[],
  now = new Date(),
): SidebarTouchpointSection[] {
  const buckets: Record<SidebarTouchpointSectionKey, SidebarTouchpointRow[]> = {
    "due today": [],
    "past due": [],
    upcoming: [],
  }

  for (const row of rows) {
    const urgency = getTouchpointUrgencyFromStored(row.dueDate, now)
    if (!urgency || urgency === "standard") continue
    buckets[urgency].push({ ...row, urgency })
  }

  return SECTION_ORDER.map((key) => {
    const items = [...buckets[key]].sort(sortByDueDateAsc)
    return {
      key,
      label: SECTION_LABELS[key],
      cap: SECTION_CAPS[key],
      items,
    }
  }).filter((section) => section.items.length > 0)
}

export function visibleSidebarItems(
  section: SidebarTouchpointSection,
  expanded: boolean,
): { visible: SidebarTouchpointRow[]; hiddenCount: number } {
  if (expanded || section.items.length <= section.cap) {
    return { visible: section.items, hiddenCount: 0 }
  }

  return {
    visible: section.items.slice(0, section.cap),
    hiddenCount: section.items.length - section.cap,
  }
}
