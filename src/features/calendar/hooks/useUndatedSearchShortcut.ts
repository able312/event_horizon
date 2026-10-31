import { useCallback } from "react"

import type { UseEventsQueryStateReturn } from "~/hooks/useEventsQueryState"
import { ACTIONS } from "../state/calendarSidePanelReducer"
import { useCalendarPanelState } from "../state/useCalendarPanelState"

/**
 * Calendar header shortcut: list undated events in the search panel, or turn that filter
 * back off. Other filters are left as they are, so the shortcut combines with a status.
 */
export function useUndatedSearchShortcut(queryState: UseEventsQueryStateReturn) {
  const { dispatch } = useCalendarPanelState()
  const { setUndated } = queryState
  const isActive = queryState.state.undated

  const toggle = useCallback(() => {
    setUndated(!isActive)
    if (!isActive) dispatch({ type: ACTIONS.OPEN_SEARCH })
  }, [dispatch, isActive, setUndated])

  return { isActive, toggle }
}
