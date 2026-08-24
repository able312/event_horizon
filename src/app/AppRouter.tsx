import type { ReactNode } from "react"
import { HashRouter } from "react-router"

export function AppRouter({ children }: { children: ReactNode }) {
  return <HashRouter>{children}</HashRouter>
}
