import { useCallback, useMemo, useReducer, type ReactNode } from "react"
import { ACTIONS, calendarSidePanelReducer, createInitialCalendarSidePanelState, type BodyMode, type CalendarSidePanelAction } from "./calendarSidePanelReducer"
import { CalendarPanelStateContext } from "./useCalendarPanelState"



export const CalendarPanelStateProvider:React.FC<{
  children: ReactNode
  bodyMode: BodyMode
  /** Whether the URL carries a search or filter on mount; only read once. */
  hasActiveSearch: boolean
  onBodyModeChange: (mode: BodyMode) => void
}> = ({ children, bodyMode, hasActiveSearch, onBodyModeChange }) => {
 
  const [state, reducerDispatch] = useReducer(
    calendarSidePanelReducer,
    { hasActiveSearch, bodyMode },
    createInitialCalendarSidePanelState,
  )
  // Keep the body destination in the URL so event Back links and reloads restore it.
  const dispatch = useCallback((action: CalendarSidePanelAction) => {
    if (action.type === ACTIONS.TOGGLE_INBOX_VIEW) {
      onBodyModeChange(bodyMode === "inbox" ? "calendar" : "inbox")
    } else if (action.type === ACTIONS.OPEN_CALENDAR_VIEW) {
      onBodyModeChange("calendar")
    }
    reducerDispatch(action)
  }, [bodyMode, onBodyModeChange])
  const ui = useMemo(() => ({ ...state, bodyMode }), [state, bodyMode])

  return (
    <CalendarPanelStateContext.Provider value={{ ui, dispatch }}>
      {children}
    </CalendarPanelStateContext.Provider>
  )
}
