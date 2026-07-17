import type { Touchpoint } from "~/definitions/database"

import { getTouchpointUrgencyFromStored } from "./touchpointStatus"

export type OverviewTouchpointSectionKey =
  | "due today"
  | "past due"
  | "upcoming"
  | "later"

export type OverviewTouchpointSection = {
  key: OverviewTouchpointSectionKey
  label: string
  items: Touchpoint[]
}

export type OverviewTouchpointGroups = {
  sections: OverviewTouchpointSection[]
  completed: Touchpoint[]
}

const SECTION_ORDER: OverviewTouchpointSectionKey[] = [
  "due today",
  "past due",
  "upcoming",
  "later",
]

const SECTION_LABELS: Record<OverviewTouchpointSectionKey, string> = {
  "due today": "Due today",
  "past due": "Past due",
  upcoming: "Upcoming",
  later: "Later",
}

function sortByDueDateAsc(a: Touchpoint, b: Touchpoint): number {
  if (!a.dueDate && !b.dueDate) return 0
  if (!a.dueDate) return 1
  if (!b.dueDate) return -1
  return a.dueDate.localeCompare(b.dueDate)
}

function sortByCompletedAtDesc(a: Touchpoint, b: Touchpoint): number {
  return (b.completedAt ?? "").localeCompare(a.completedAt ?? "")
}

function sectionKeyForIncomplete(
  row: Touchpoint,
  now: Date,
): OverviewTouchpointSectionKey {
  const urgency = getTouchpointUrgencyFromStored(row.dueDate, now)
  if (!urgency || urgency === "standard") return "later"
  return urgency
}

/** Groups event touchpoints for the overview card; completed returned separately. */
export function groupOverviewTouchpoints(
  rows: Touchpoint[],
  now = new Date(),
): OverviewTouchpointGroups {
  const buckets: Record<OverviewTouchpointSectionKey, Touchpoint[]> = {
    "due today": [],
    "past due": [],
    upcoming: [],
    later: [],
  }
  const completed: Touchpoint[] = []

  for (const row of rows) {
    if (row.completedAt) {
      completed.push(row)
      continue
    }
    buckets[sectionKeyForIncomplete(row, now)].push(row)
  }

  const sections = SECTION_ORDER.map((key) => {
    const items = [...buckets[key]].sort(sortByDueDateAsc)
    return {
      key,
      label: SECTION_LABELS[key],
      items,
    }
  }).filter((section) => section.items.length > 0)

  return {
    sections,
    completed: [...completed].sort(sortByCompletedAtDesc),
  }
}
