import { useReducer, type ReactNode } from "react"
import { calendarSidePanelReducer, initialCalendarSidePanelState } from "./calendarSidePanelReducer"
import { CalendarPanelStateContext } from "./useCalendarPanelState"



export const CalendarPanelStateProvider:React.FC<{children: ReactNode}> = ({ children }) => {
 
  const [ui, dispatch] = useReducer(calendarSidePanelReducer, initialCalendarSidePanelState)

  return (
    <CalendarPanelStateContext.Provider value={{ ui, dispatch }}>
      {children}
    </CalendarPanelStateContext.Provider>
  )
}