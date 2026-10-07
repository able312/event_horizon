import type { EventStatus } from "~/definitions/database"

export type CompactGlyphShape = "diamond" | "dashed-ring" | "dot" | "check" | "cross"

export type CompactEventStatusStyle = {
  glyph: CompactGlyphShape
  glyphClassName: string
  rowClassName: string
  titleClassName: string
  countClassName: string
}

const DEFAULT_ROW = "hover:bg-stone-100"
const DEFAULT_TITLE = "font-normal text-foreground"
const DEFAULT_COUNT = "text-muted-foreground"

/**
 * Status reads from the glyph's shape and colour. New lead is the only status
 * that fills the row; keep it that way so leads stand out in a crowded month.
 */
export const COMPACT_EVENT_STATUS_STYLES: Record<EventStatus, CompactEventStatusStyle> = {
  new_lead: {
    glyph: "diamond",
    glyphClassName: "bg-status-new-bg",
    rowClassName: "bg-status-new-row-bg hover:bg-status-new-row-bg-hover",
    titleClassName: "font-semibold text-status-new-row-fg",
    countClassName: "text-status-new-row-fg",
  },
  tentative: {
    glyph: "dashed-ring",
    glyphClassName: "border-status-tentative-glyph",
    rowClassName: DEFAULT_ROW,
    titleClassName: DEFAULT_TITLE,
    countClassName: DEFAULT_COUNT,
  },
  confirmed: {
    glyph: "dot",
    glyphClassName: "bg-status-confirmed-fg",
    rowClassName: DEFAULT_ROW,
    titleClassName: DEFAULT_TITLE,
    countClassName: DEFAULT_COUNT,
  },
  closed: {
    glyph: "check",
    glyphClassName: "text-status-complete-glyph",
    rowClassName: DEFAULT_ROW,
    titleClassName: "font-normal text-muted-foreground",
    countClassName: DEFAULT_COUNT,
  },
  // Not covered by the compact spec: recedes like Complete, told apart by its cross glyph.
  lost: {
    glyph: "cross",
    glyphClassName: "text-status-complete-glyph",
    rowClassName: DEFAULT_ROW,
    titleClassName: "font-normal text-muted-foreground",
    countClassName: DEFAULT_COUNT,
  },
}
