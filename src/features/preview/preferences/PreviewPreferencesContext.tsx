import {
  createContext,
  createElement,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react"

import {
  createInitialPreviewPreferences,
  previewPreferencesReducer,
} from "./previewPreferencesReducer"
import type { PreviewPreferencesAction, PreviewPreferencesState } from "./types"

type PreviewPreferencesContextValue = {
  state: PreviewPreferencesState
  dispatch: Dispatch<PreviewPreferencesAction>
}

const PreviewPreferencesContext = createContext<PreviewPreferencesContextValue | null>(null)

export function PreviewPreferencesProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(
    previewPreferencesReducer,
    undefined,
    createInitialPreviewPreferences,
  )

  const value = useMemo(() => ({ state, dispatch }), [state, dispatch])

  return createElement(PreviewPreferencesContext.Provider, { value }, children)
}

// Provider and hook live together for a small preview-local context module.
// eslint-disable-next-line react-refresh/only-export-components
export function usePreviewPreferences(): PreviewPreferencesContextValue {
  const context = useContext(PreviewPreferencesContext)
  if (!context) {
    throw new Error("usePreviewPreferences must be used within PreviewPreferencesProvider")
  }
  return context
}
