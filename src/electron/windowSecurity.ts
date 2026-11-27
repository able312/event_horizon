import type { WebContents } from "electron"

type GuardedContents = Pick<WebContents, "on" | "setWindowOpenHandler">

/** The URL without its hash, so hash-router moves inside the app compare equal. */
function withoutHash(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl)
    url.hash = ""
    return url.href
  } catch {
    return null
  }
}

/** True only for the app's own page; any other document (remote or local) is refused. */
export function isAppNavigation(targetUrl: string, rendererUrl: string): boolean {
  const target = withoutHash(targetUrl)
  return target !== null && target === withoutHash(rendererUrl)
}

/**
 * Keeps the window on the bundled app: the renderer can't open new windows (which would get
 * the preload API) or navigate the window to another page. External links go through the
 * allowlisted `system:open-external` IPC instead.
 */
export function lockWindowToApp(contents: GuardedContents, rendererUrl: string) {
  contents.setWindowOpenHandler(() => ({ action: "deny" }))
  const blockOffAppNavigation = (event: { preventDefault: () => void }, url: string) => {
    if (!isAppNavigation(url, rendererUrl)) event.preventDefault()
  }
  contents.on("will-navigate", blockOffAppNavigation)
  contents.on("will-redirect", blockOffAppNavigation)
  contents.on("will-attach-webview", event => event.preventDefault())
}
