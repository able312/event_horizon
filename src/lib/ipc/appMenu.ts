import type { GenerateMenuContext } from "~/definitions/ipc"

/** Tells the main process which Generate menu items apply to the current view. */
export function setGenerateMenuContext(context: GenerateMenuContext): void {
  window.electron.ipcRenderer.send("generate:active", context)
}

/** Subscribes to navigation requests from the app menu. Returns an unsubscribe function. */
export function onMenuNavigate(listener: (...args: unknown[]) => void): () => void {
  window.electron.ipcRenderer.on("navigate", listener)

  return () => {
    window.electron.ipcRenderer.removeListener("navigate", listener)
  }
}
