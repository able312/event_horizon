import type { BrowserWindow } from "electron"

type ClosableWindow = Pick<BrowserWindow, "on" | "once" | "hide" | "isFullScreen" | "setFullScreen">

/**
 * On macOS, closing hides the window instead of destroying it, so the app keeps running in the
 * dock with its live data (and the new request alerts and badge) intact. Quitting still closes it.
 */
export function hideOnClose(window: ClosableWindow, platform: NodeJS.Platform, isQuitting: () => boolean) {
  if (platform !== "darwin") return
  window.on("close", event => {
    if (isQuitting()) return
    event.preventDefault()
    if (!window.isFullScreen()) {
      window.hide()
      return
    }
    // Hiding a full-screen window leaves an empty black Space behind.
    window.once("leave-full-screen", () => window.hide())
    window.setFullScreen(false)
  })
}
