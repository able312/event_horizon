import { useReducer, type ReactNode } from "react"
import { initialUpdaterState, updaterReducer } from "./updaterReducer"
import { UpdaterContext } from "./useUpdater"

// Lives above the routes so update progress survives navigation between views.
export const UpdaterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [updater, dispatch] = useReducer(updaterReducer, initialUpdaterState)

  return (
    <UpdaterContext.Provider value={{ updater, dispatch }}>
      {children}
    </UpdaterContext.Provider>
  )
}
