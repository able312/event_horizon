import { describe, expect, it } from "vitest"

import {
  ACTIONS,
  calendarSidePanelReducer,
  initialCalendarSidePanelState,
} from "./calendarSidePanelReducer"

describe("calendarSidePanelReducer", () => {
  it("toggles body mode between calendar and leads", () => {
    const opened = calendarSidePanelReducer(initialCalendarSidePanelState, {
      type: ACTIONS.TOGGLE_LEADS_VIEW,
    })
    expect(opened.bodyMode).toBe("leads")

    const closed = calendarSidePanelReducer(opened, {
      type: ACTIONS.TOGGLE_LEADS_VIEW,
    })
    expect(closed.bodyMode).toBe("calendar")
  })

  it("keeps body mode through sidebar mode transitions", () => {
    const leadsState = calendarSidePanelReducer(initialCalendarSidePanelState, {
      type: ACTIONS.TOGGLE_LEADS_VIEW,
    })

    const openedSearch = calendarSidePanelReducer(leadsState, {
      type: ACTIONS.OPEN_SEARCH,
    })
    const openedCreate = calendarSidePanelReducer(openedSearch, {
      type: ACTIONS.OPEN_CREATE,
      prefillIso: null,
    })

    expect(openedSearch.bodyMode).toBe("leads")
    expect(openedCreate.bodyMode).toBe("leads")
  })
})
