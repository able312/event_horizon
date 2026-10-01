import { useContext, createContext } from "react"
import { initialUpdaterState, type UpdaterAction, type UpdaterState } from "./updaterReducer"

type UpdaterContextValue = {
  updater: UpdaterState
  dispatch: React.Dispatch<UpdaterAction>
}

// Defaults to an idle updater so the sidebar footer can render without a provider.
export const UpdaterContext = createContext<UpdaterContextValue>({
  updater: initialUpdaterState,
  dispatch: () => undefined,
})

export function useUpdater() {
  return useContext(UpdaterContext)
}
