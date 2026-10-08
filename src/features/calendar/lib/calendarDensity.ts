import type { Event, EventStatus } from "~/definitions/database"

/**
 * Tallest a full card can render, so fit is plain arithmetic rather than live measurement.
 * Worst case in CalendarEventCard: 2px border each side, the status band wrapped onto two
 * lines (34px), a two-line title plus client name (~65px). Keep in sync with that layout.
 */
export const FULL_CARD_MAX_HEIGHT = 104
/** Gap between stacked cards in a day cell (`space-y-1`). */
export const FULL_CARD_GAP = 4
/** Columns narrower than this switch the whole grid to compact lines... */
export const NARROW_COLUMN_ENTER_WIDTH = 160
/** ...and only switch back once they reach this width, so resizing near the edge doesn't flicker. */
export const NARROW_COLUMN_EXIT_WIDTH = 176
/** A compact row returns to full cards only when every day fits with this much to spare. */
export const ROW_FIT_BUFFER = 16
/** Day cell chrome above the event list: vertical padding plus the day number. */
export const DAY_CELL_CHROME_HEIGHT = 32
/** Day cell horizontal padding plus its right border. */
export const DAY_CELL_HORIZONTAL_CHROME = 17
/** Draft chip above the event list (border, padding, one 15px line) plus the 4px gap below it. */
export const DRAFT_CHIP_RESERVED_HEIGHT = 25
/** Today's day number is a 24px circle with margins, 8px taller than the plain number in DAY_CELL_CHROME_HEIGHT. */
export const TODAY_MARKER_EXTRA_HEIGHT = 8

export type CalendarDensity = {
  /** Key of the view the rows belong to; row state resets when it changes. */
  viewKey: string
  isNarrow: boolean
  /** One flag per week row: true when that row uses compact lines. */
  compactRows: boolean[]
}

export type CalendarDensityInput = {
  viewKey: string
  /** Grid content box; 0 means not measured yet. */
  gridWidth: number
  gridHeight: number
  /** Height each day's content needs as full cards, grouped by week row (7 per row). */
  dayHeightsByRow: number[][]
}

export const INITIAL_CALENDAR_DENSITY: CalendarDensity = {
  viewKey: "",
  isNarrow: false,
  compactRows: [],
}

/** Height of n stacked full cards. */
export function fullCardsHeight(cardCount: number): number {
  if (cardCount <= 0) return 0
  return cardCount * FULL_CARD_MAX_HEIGHT + (cardCount - 1) * FULL_CARD_GAP
}

/** Narrow below 160px; once narrow, stays narrow until 176px. */
export function resolveNarrowColumns(columnWidth: number, wasNarrow: boolean): boolean {
  if (columnWidth <= 0) return false
  return wasNarrow ? columnWidth < NARROW_COLUMN_EXIT_WIDTH : columnWidth < NARROW_COLUMN_ENTER_WIDTH
}

/** Goes compact when any day overflows; returns to full cards only when every day fits with the buffer to spare. */
export function resolveCompactRow(dayHeights: number[], availableHeight: number, wasCompact: boolean): boolean {
  if (availableHeight <= 0) return false
  const tallestDay = Math.max(0, ...dayHeights)
  return wasCompact ? tallestDay + ROW_FIT_BUFFER > availableHeight : tallestDay > availableHeight
}

/**
 * Next density for the grid. Returns `previous` unchanged when nothing flips,
 * so callers can store it in state without extra renders.
 */
export function resolveCalendarDensity(previous: CalendarDensity, input: CalendarDensityInput): CalendarDensity {
  const sameView = previous.viewKey === input.viewKey
  const rowCount = input.dayHeightsByRow.length
  const columnWidth = input.gridWidth / 7 - DAY_CELL_HORIZONTAL_CHROME
  const availableHeight = rowCount > 0 ? input.gridHeight / rowCount - DAY_CELL_CHROME_HEIGHT : 0

  const isNarrow = resolveNarrowColumns(input.gridWidth > 0 ? columnWidth : 0, previous.isNarrow)
  const compactRows = input.dayHeightsByRow.map((heights, row) =>
    resolveCompactRow(heights, input.gridHeight > 0 ? availableHeight : 0, sameView && previous.compactRows[row] === true),
  )

  const unchanged =
    sameView &&
    previous.isNarrow === isNarrow &&
    previous.compactRows.length === compactRows.length &&
    previous.compactRows.every((value, row) => value === compactRows[row])

  return unchanged ? previous : { viewKey: input.viewKey, isNarrow, compactRows }
}

export type DayContent = {
  eventCount: number
  /** Space taken above the cards in this cell, e.g. the draft chip or today's larger day number. */
  reservedHeight: number
}

/**
 * Height each day needs as full cards (capped at maxVisible, matching the "+N more" rule)
 * plus its reserved space, grouped into week rows of 7. Cells outside the month count as 0.
 */
export function buildDayHeightsByRow(days: DayContent[], startingDay: number, maxVisible: number): number[][] {
  const cells = [
    ...Array<number>(startingDay).fill(0),
    ...days.map((day) => fullCardsHeight(Math.min(day.eventCount, maxVisible)) + day.reservedHeight),
  ]
  const rowCount = Math.max(1, Math.ceil(cells.length / 7))
  return Array.from({ length: rowCount }, (_, row) => {
    const rowCells = cells.slice(row * 7, row * 7 + 7)
    return [...rowCells, ...Array<number>(7 - rowCells.length).fill(0)]
  })
}

const COMPACT_STATUS_ORDER: Record<EventStatus, number> = {
  new_lead: 0,
  tentative: 1,
  confirmed: 2,
  closed: 3,
  // Not covered by the compact spec: sorts with Complete, after it.
  lost: 4,
}

/** New lead, Tentative, Confirmed, Complete; ties keep their incoming order (start time). */
export function sortEventsByCompactStatus(events: Event[]): Event[] {
  // Array#sort is stable, so equal statuses stay in start-time order.
  return [...events].sort((a, b) => COMPACT_STATUS_ORDER[a.status] - COMPACT_STATUS_ORDER[b.status])
}
