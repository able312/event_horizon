import { describe, expect, it } from "vitest"

import {
  ACTIONS,
  calendarSidePanelReducer,
  initialCalendarSidePanelState,
} from "./calendarSidePanelReducer"

describe("calendarSidePanelReducer", () => {
  it("toggles body mode between calendar and unscheduled", () => {
    const opened = calendarSidePanelReducer(initialCalendarSidePanelState, {
      type: ACTIONS.TOGGLE_UNSCHEDULED_VIEW,
    })
    expect(opened.bodyMode).toBe("unscheduled")

    const closed = calendarSidePanelReducer(opened, {
      type: ACTIONS.TOGGLE_UNSCHEDULED_VIEW,
    })
    expect(closed.bodyMode).toBe("calendar")
  })

  it("keeps body mode through sidebar mode transitions", () => {
    const unscheduledState = calendarSidePanelReducer(initialCalendarSidePanelState, {
      type: ACTIONS.TOGGLE_UNSCHEDULED_VIEW,
    })

    const openedSearch = calendarSidePanelReducer(unscheduledState, {
      type: ACTIONS.OPEN_SEARCH,
    })
    const openedCreate = calendarSidePanelReducer(openedSearch, {
      type: ACTIONS.OPEN_CREATE,
      prefillIso: null,
    })

    expect(openedSearch.bodyMode).toBe("unscheduled")
    expect(openedCreate.bodyMode).toBe("unscheduled")
  })
})
