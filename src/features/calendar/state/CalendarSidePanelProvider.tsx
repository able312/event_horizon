import { useCallback, useReducer, type ReactNode } from "react"
import { ACTIONS, calendarSidePanelReducer, initialCalendarSidePanelState, type BodyMode, type CalendarSidePanelAction } from "./calendarSidePanelReducer"
import { CalendarPanelStateContext } from "./useCalendarPanelState"



export const CalendarPanelStateProvider:React.FC<{
  children: ReactNode
  bodyMode: BodyMode
  onBodyModeChange: (mode: BodyMode) => void
}> = ({ children, bodyMode, onBodyModeChange }) => {
 
  const [state, reducerDispatch] = useReducer(calendarSidePanelReducer, initialCalendarSidePanelState)
  // Keep the body destination in the URL so event Back links and reloads restore it.
  const dispatch = useCallback((action: CalendarSidePanelAction) => {
    if (action.type === ACTIONS.TOGGLE_INBOX_VIEW) {
      onBodyModeChange(bodyMode === "inbox" ? "calendar" : "inbox")
    } else if (action.type === ACTIONS.OPEN_CALENDAR_VIEW) {
      onBodyModeChange("calendar")
    }
    reducerDispatch(action)
  }, [bodyMode, onBodyModeChange])
  const ui = { ...state, bodyMode }

  return (
    <CalendarPanelStateContext.Provider value={{ ui, dispatch }}>
      {children}
    </CalendarPanelStateContext.Provider>
  )
}
