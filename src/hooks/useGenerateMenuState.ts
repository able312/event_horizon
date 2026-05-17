import { useEffect } from "react"
import { matchPath, useLocation } from "react-router"
import type { GenerateMenuContext } from "~/definitions/ipc"

function getGenerateMenuContext(pathname: string): GenerateMenuContext {
  const match = matchPath("/events/:id", pathname)
  const eventId = match?.params.id ?? null

  if (eventId) {
    return { view: "event-details", eventId }
  }

  return { view: "other", eventId: null }
}

export function useGenerateMenuState() {
  const location = useLocation()

  useEffect(() => {
    const context = getGenerateMenuContext(location.pathname)
    window.electron.ipcRenderer.send("generate:active", context)
  }, [location.pathname])
}
