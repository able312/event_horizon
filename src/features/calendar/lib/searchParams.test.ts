import { describe, expect, it } from "vitest"

import { toLocalDateEndExclusiveIso, toLocalDateStartIso } from "~/lib/months"
import {
  buildCalendarSearchInput,
  buildEventsSearchParams,
  createInitialCalendarSearchUiState,
} from "./searchParams"

const queryState = {
  view: "calendar" as const,
  date: "2026-10",
  search: "  smith ",
  type: null,
  status: "new_lead" as const,
  undated: false,
}

const withRange = {
  ...createInitialCalendarSearchUiState(),
  dateFrom: "2026-10-01",
  dateTo: "2026-10-31",
}

describe("buildEventsSearchParams", () => {
  it("sends the local date range as ISO bounds", () => {
    const params = buildEventsSearchParams(buildCalendarSearchInput(queryState), withRange)

    expect(params).toMatchObject({
      query: "smith",
      status: "new_lead",
      startFrom: toLocalDateStartIso("2026-10-01"),
      startTo: toLocalDateEndExclusiveIso("2026-10-31"),
      noDate: false,
    })
  })

  it("drops the date range for an undated search, which the server would reject", () => {
    const params = buildEventsSearchParams(
      buildCalendarSearchInput({ ...queryState, undated: true }),
      withRange,
    )

    expect(params).toMatchObject({
      query: "smith",
      status: "new_lead",
      startFrom: null,
      startTo: null,
      noDate: true,
    })
  })
})
