import { useCallback, useState } from "react"

export type FinancialView = "estimate" | "invoice"

export const DEFAULT_FINANCIAL_VIEW: FinancialView = "estimate"

// Last view picked for each event, kept for the rest of the app session so
// coming back to Financials opens where you left off.
const lastViewByEvent = new Map<string, FinancialView>()

/** Which Financials view (Estimate or Invoice) to show for an event, remembered per event. */
export function useFinancialView(eventId: string): [FinancialView, (view: FinancialView) => void] {
  const [view, setViewState] = useState<FinancialView>(
    () => lastViewByEvent.get(eventId) ?? DEFAULT_FINANCIAL_VIEW,
  )
  // Follow the event if the component is reused for a different one.
  const [viewEventId, setViewEventId] = useState(eventId)
  if (viewEventId !== eventId) {
    setViewEventId(eventId)
    setViewState(lastViewByEvent.get(eventId) ?? DEFAULT_FINANCIAL_VIEW)
  }

  const setView = useCallback(
    (next: FinancialView) => {
      if (eventId) lastViewByEvent.set(eventId, next)
      setViewState(next)
    },
    [eventId],
  )

  return [view, setView]
}

/** Test-only: forget every remembered view. */
export function resetRememberedFinancialViews(): void {
  lastViewByEvent.clear()
}
