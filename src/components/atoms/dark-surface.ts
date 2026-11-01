import { createContext, createElement, useContext, type ReactNode } from "react"

/**
 * Marks a subtree as a dark surface (e.g. the app sidebar).
 *
 * Popovers and menus render in a portal on <body>, outside the `.dark`
 * element that styles their trigger. They read this context (which React
 * carries through portals) to opt back into the dark theme.
 */
const DarkSurfaceContext = createContext(false)

export function DarkSurfaceProvider({ children }: { children: ReactNode }) {
  return createElement(DarkSurfaceContext.Provider, { value: true }, children)
}

/** `"dark"` when rendered inside a DarkSurfaceProvider, otherwise undefined. */
export function useDarkSurfaceClass(): string | undefined {
  return useContext(DarkSurfaceContext) ? "dark" : undefined
}
