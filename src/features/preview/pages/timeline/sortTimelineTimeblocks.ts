import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"

type TimeblockWithStringTime = TimeblockWithItems & { time: string }

function hasNonBlankTime<T extends TimeblockWithItems>(
  timeblock: T,
): timeblock is T & TimeblockWithStringTime {
  return typeof timeblock.time === "string" && timeblock.time.trim().length > 0
}

export function sortTimelineTimeblocks<T extends TimeblockWithItems>(timeblocks: T[]): T[] {
  return [...timeblocks]
    .filter(hasNonBlankTime)
    .sort((a, b) => {
      const timeCompare = a.time.localeCompare(b.time)
      if (timeCompare !== 0) return timeCompare

      const titleCompare = a.title.localeCompare(b.title)
      if (titleCompare !== 0) return titleCompare

      return a.id.localeCompare(b.id)
    })
}
