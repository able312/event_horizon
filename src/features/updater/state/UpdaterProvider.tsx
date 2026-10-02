import { useEffect, useReducer, type ReactNode } from "react"
import { ACTIONS, initialUpdaterState, updaterReducer } from "./updaterReducer"
import { UpdaterContext } from "./useUpdater"
import { synchronizeUpdater } from "./synchronizeUpdater"

// Lives above the routes so update progress survives navigation between views.
export const UpdaterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [updater, dispatch] = useReducer(updaterReducer, initialUpdaterState)

  useEffect(() => {
    if (import.meta.env.DEV || !window.api?.updater) return
    return synchronizeUpdater(window.api.updater, status => dispatch({ type: ACTIONS.STATUS_CHANGED, status }))
  }, [])

  return (
    <UpdaterContext.Provider value={{ updater, dispatch }}>
      {children}
    </UpdaterContext.Provider>
  )
}
