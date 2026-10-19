/**
 * CompactEventChipContent
 *
 * What a compact event chip shows: status glyph, title and guest count.
 * The caller supplies the row element (a button on the calendar grid, plain
 * text in read-only previews) and its COMPACT_EVENT_STATUS_STYLES row class.
 *
 * Location: src/features/calendar/components/CompactEventChipContent.tsx
 */

import type { Event } from "~/definitions/database"
import { cn } from "~/lib/utils"
import { formatGuestCount, getGuestCountRange } from "../lib/eventCardContent"
import CompactStatusGlyph from "./CompactStatusGlyph"
import { COMPACT_EVENT_STATUS_STYLES } from "./compactEventStatus"

type CompactEventChipContentProps = {
  event: Event
}

function CompactEventChipContent({ event }: CompactEventChipContentProps) {
  const style = COMPACT_EVENT_STATUS_STYLES[event.status]
  const guestCount = getGuestCountRange(event)

  return (
    <>
      <CompactStatusGlyph shape={style.glyph} className={style.glyphClassName} />
      <span className={cn("min-w-0 flex-1 truncate text-xs leading-none", style.titleClassName)}>
        {event.title}
      </span>
      {guestCount ? (
        <span className={cn("shrink-0 text-[11px] font-medium leading-none tabular-nums", style.countClassName)}>
          {formatGuestCount(guestCount)}
        </span>
      ) : null}
    </>
  )
}

export default CompactEventChipContent
