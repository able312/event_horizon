import { useEffect } from "react"
import { matchPath, useLocation } from "react-router"
import type { GenerateMenuContext } from "~/definitions/ipc"

function getGenerateMenuContext(pathname: string): GenerateMenuContext {
  const eventDetailMatch = matchPath({ path: "/events/:id/*", end: false }, pathname)
  const eventIdFromDetail = eventDetailMatch?.params.id ?? null

  if (eventIdFromDetail) {
    return { view: "event-details", eventId: eventIdFromDetail }
  }

  const previewMatch = matchPath({ path: "/preview/:id", end: false }, pathname)
  const eventIdFromPreview = previewMatch?.params.id ?? null

  if (eventIdFromPreview) {
    return { view: "event-details", eventId: eventIdFromPreview }
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
