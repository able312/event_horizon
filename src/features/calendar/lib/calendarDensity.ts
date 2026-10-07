import type { Event, EventStatus } from "~/definitions/database"

/** Full cards are at least this tall, so fit is plain arithmetic rather than live measurement. */
export const FULL_CARD_MIN_HEIGHT = 132
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
  /** Number of cards each day would show, grouped by week row (7 per row). */
  cardCountsByRow: number[][]
}

export const INITIAL_CALENDAR_DENSITY: CalendarDensity = {
  viewKey: "",
  isNarrow: false,
  compactRows: [],
}

/** Height of n stacked full cards. */
export function fullCardsHeight(cardCount: number): number {
  if (cardCount <= 0) return 0
  return cardCount * FULL_CARD_MIN_HEIGHT + (cardCount - 1) * FULL_CARD_GAP
}

/** Narrow below 160px; once narrow, stays narrow until 176px. */
export function resolveNarrowColumns(columnWidth: number, wasNarrow: boolean): boolean {
  if (columnWidth <= 0) return false
  return wasNarrow ? columnWidth < NARROW_COLUMN_EXIT_WIDTH : columnWidth < NARROW_COLUMN_ENTER_WIDTH
}

/** Goes compact when any day overflows; returns to full cards only when every day fits with the buffer to spare. */
export function resolveCompactRow(cardCounts: number[], availableHeight: number, wasCompact: boolean): boolean {
  if (availableHeight <= 0) return false
  const tallestDay = Math.max(0, ...cardCounts.map(fullCardsHeight))
  return wasCompact ? tallestDay + ROW_FIT_BUFFER > availableHeight : tallestDay > availableHeight
}

/**
 * Next density for the grid. Returns `previous` unchanged when nothing flips,
 * so callers can store it in state without extra renders.
 */
export function resolveCalendarDensity(previous: CalendarDensity, input: CalendarDensityInput): CalendarDensity {
  const sameView = previous.viewKey === input.viewKey
  const rowCount = input.cardCountsByRow.length
  const columnWidth = input.gridWidth / 7 - DAY_CELL_HORIZONTAL_CHROME
  const availableHeight = rowCount > 0 ? input.gridHeight / rowCount - DAY_CELL_CHROME_HEIGHT : 0

  const isNarrow = resolveNarrowColumns(input.gridWidth > 0 ? columnWidth : 0, previous.isNarrow)
  const compactRows = input.cardCountsByRow.map((counts, row) =>
    resolveCompactRow(counts, input.gridHeight > 0 ? availableHeight : 0, sameView && previous.compactRows[row] === true),
  )

  const unchanged =
    sameView &&
    previous.isNarrow === isNarrow &&
    previous.compactRows.length === compactRows.length &&
    previous.compactRows.every((value, row) => value === compactRows[row])

  return unchanged ? previous : { viewKey: input.viewKey, isNarrow, compactRows }
}

/**
 * Cards each day would show (capped at maxVisible, matching the "+N more" rule),
 * grouped into week rows of 7. Cells outside the month count as 0.
 */
export function buildCardCountsByRow(eventCountsByDay: number[], startingDay: number, maxVisible: number): number[][] {
  const cells = [
    ...Array<number>(startingDay).fill(0),
    ...eventCountsByDay.map((count) => Math.min(count, maxVisible)),
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
