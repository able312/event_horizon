import { useContext, createContext } from "react"
import type { CalendarSidePanelAction, CalendarSidePanelState } from "./calendarSidePanelReducer"

type CalendarPanelStateContextValue = {
  ui: CalendarSidePanelState
  dispatch: React.Dispatch<CalendarSidePanelAction>
}


export const CalendarPanelStateContext = createContext<CalendarPanelStateContextValue | null>(null)

export function useCalendarPanelState () {
  const context = useContext(CalendarPanelStateContext)
  if (!context) {
    throw new Error("useCalendarPanelState must be used within CalendarPanelStateProvider")
  }
  return context
}