import { useContext, createContext } from "react"
import type { BodyMode, CalendarSidePanelAction, CalendarSidePanelState } from "./calendarSidePanelReducer"

type CalendarPanelStateContextValue = {
  /** Reducer state plus the body mode, which comes from the URL. */
  ui: CalendarSidePanelState & { bodyMode: BodyMode }
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