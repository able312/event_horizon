import { describe, expect, it } from "vitest"
import type { Event } from "~/definitions/database"
import {
  buildDayHeightsByRow,
  DAY_CELL_CHROME_HEIGHT,
  DAY_CELL_HORIZONTAL_CHROME,
  DRAFT_CHIP_RESERVED_HEIGHT,
  INITIAL_CALENDAR_DENSITY,
  fullCardsHeight,
  resolveCalendarDensity,
  resolveCompactRow,
  resolveNarrowColumns,
  sortEventsByCompactStatus,
} from "./calendarDensity"

/** Grid width whose day columns have the given inner width. */
const gridWidthFor = (columnWidth: number) => (columnWidth + DAY_CELL_HORIZONTAL_CHROME) * 7
/** Day heights for the given card counts per day. */
const cardRows = (counts: number[][]) => counts.map((row) => row.map(fullCardsHeight))
/** Grid height whose cells have the given available height across `rows` rows. */
const gridHeightFor = (availableHeight: number, rows: number) => (availableHeight + DAY_CELL_CHROME_HEIGHT) * rows

describe("fullCardsHeight", () => {
  it("stacks 104px cards with the gap between them", () => {
    expect(fullCardsHeight(0)).toBe(0)
    expect(fullCardsHeight(1)).toBe(104)
    expect(fullCardsHeight(2)).toBe(212)
  })
})

describe("resolveNarrowColumns", () => {
  it("goes narrow below 160px", () => {
    expect(resolveNarrowColumns(159, false)).toBe(true)
    expect(resolveNarrowColumns(160, false)).toBe(false)
  })

  it("stays narrow until 176px", () => {
    expect(resolveNarrowColumns(170, true)).toBe(true)
    expect(resolveNarrowColumns(176, true)).toBe(false)
  })

  it("is never narrow before the grid is measured", () => {
    expect(resolveNarrowColumns(0, true)).toBe(false)
  })
})

describe("resolveCompactRow", () => {
  it("goes compact when any day overflows", () => {
    expect(resolveCompactRow([0, 104, 212], 211, false)).toBe(true)
    expect(resolveCompactRow([0, 104, 212], 212, false)).toBe(false)
  })

  it("returns to full cards only with 16px to spare", () => {
    expect(resolveCompactRow([104], 119, true)).toBe(true)
    expect(resolveCompactRow([104], 120, true)).toBe(false)
  })

  it("keeps empty rows as full cards", () => {
    expect(resolveCompactRow([0, 0, 0], 40, false)).toBe(false)
  })
})

describe("resolveCalendarDensity", () => {
  const roomy = { gridWidth: gridWidthFor(200), gridHeight: gridHeightFor(300, 2) }

  it("flips only the busy week row", () => {
    const density = resolveCalendarDensity(INITIAL_CALENDAR_DENSITY, {
      viewKey: "2026-10",
      ...roomy,
      dayHeightsByRow: cardRows([[1, 0, 0], [3, 0, 0]]),
    })

    expect(density.isNarrow).toBe(false)
    expect(density.compactRows).toEqual([false, true])
  })

  it("marks the whole grid narrow when columns are tight", () => {
    const density = resolveCalendarDensity(INITIAL_CALENDAR_DENSITY, {
      viewKey: "2026-10",
      gridWidth: gridWidthFor(150),
      gridHeight: roomy.gridHeight,
      dayHeightsByRow: cardRows([[1], [1]]),
    })

    expect(density.isNarrow).toBe(true)
  })

  it("returns the same object when nothing flips", () => {
    const input = { viewKey: "2026-10", ...roomy, dayHeightsByRow: cardRows([[1], [3]]) }
    const first = resolveCalendarDensity(INITIAL_CALENDAR_DENSITY, input)

    expect(resolveCalendarDensity(first, { ...input, gridHeight: input.gridHeight + 2 })).toBe(first)
  })

  it("keeps a compact row inside the buffer, and resets it on view change", () => {
    const compact = resolveCalendarDensity(INITIAL_CALENDAR_DENSITY, {
      viewKey: "2026-10",
      gridWidth: roomy.gridWidth,
      gridHeight: gridHeightFor(103, 1),
      dayHeightsByRow: cardRows([[1]]),
    })
    const nearEdge = { gridWidth: roomy.gridWidth, gridHeight: gridHeightFor(110, 1), dayHeightsByRow: cardRows([[1]]) }

    expect(resolveCalendarDensity(compact, { viewKey: "2026-10", ...nearEdge }).compactRows).toEqual([true])
    expect(resolveCalendarDensity(compact, { viewKey: "2026-11", ...nearEdge }).compactRows).toEqual([false])
  })

  it("shows full cards until the grid is measured", () => {
    const density = resolveCalendarDensity(INITIAL_CALENDAR_DENSITY, {
      viewKey: "2026-10",
      gridWidth: 0,
      gridHeight: 0,
      dayHeightsByRow: cardRows([[3, 3]]),
    })

    expect(density).toEqual({ viewKey: "2026-10", isNarrow: false, compactRows: [false] })
  })
})

describe("buildDayHeightsByRow", () => {
  const days = (counts: number[]) => counts.map((eventCount) => ({ eventCount, reservedHeight: 0 }))

  it("places days after the leading blanks, caps counts and pads the last row", () => {
    const counts = Array<number>(30).fill(0)
    counts[0] = 5
    counts[5] = 2

    const rows = buildDayHeightsByRow(days(counts), 2, 3)

    expect(rows).toHaveLength(5)
    expect(rows[0]).toEqual([0, 0, fullCardsHeight(3), 0, 0, 0, 0])
    expect(rows[1]).toEqual([fullCardsHeight(2), 0, 0, 0, 0, 0, 0])
    expect(rows[4]).toEqual([0, 0, 0, 0, 0, 0, 0])
  })

  it("adds reserved space such as the draft chip to that day's cards", () => {
    const rows = buildDayHeightsByRow(
      [
        { eventCount: 2, reservedHeight: DRAFT_CHIP_RESERVED_HEIGHT },
        { eventCount: 0, reservedHeight: DRAFT_CHIP_RESERVED_HEIGHT },
      ],
      0,
      3,
    )

    expect(rows[0].slice(0, 2)).toEqual([fullCardsHeight(2) + DRAFT_CHIP_RESERVED_HEIGHT, DRAFT_CHIP_RESERVED_HEIGHT])
  })

  it("compacts a row whose cards fit only without the draft chip", () => {
    const available = fullCardsHeight(2)
    const withDraft = buildDayHeightsByRow([{ eventCount: 2, reservedHeight: DRAFT_CHIP_RESERVED_HEIGHT }], 0, 3)

    expect(resolveCompactRow(cardRows([[2]])[0], available, false)).toBe(false)
    expect(resolveCompactRow(withDraft[0], available, false)).toBe(true)
  })
})

describe("sortEventsByCompactStatus", () => {
  const event = (id: string, status: Event["status"]) => ({ id, status }) as Event

  it("orders leads first, then tentative, confirmed, complete, lost", () => {
    const sorted = sortEventsByCompactStatus([
      event("a", "closed"),
      event("b", "confirmed"),
      event("c", "lost"),
      event("d", "new_lead"),
      event("e", "tentative"),
    ])

    expect(sorted.map((e) => e.status)).toEqual(["new_lead", "tentative", "confirmed", "closed", "lost"])
  })

  it("keeps the incoming order within a status", () => {
    const sorted = sortEventsByCompactStatus([
      event("early", "confirmed"),
      event("lead", "new_lead"),
      event("late", "confirmed"),
    ])

    expect(sorted.map((e) => e.id)).toEqual(["lead", "early", "late"])
  })
})
