import { BrowserWindow, ipcMain, type IpcMainInvokeEvent } from "electron"
import type { AuthService } from "../services/authService.js"

const CHANNELS = ["auth:get-status", "auth:sign-in", "auth:sign-out", "auth:get-access-token"] as const

// Tokens are only handed to the app's own top-level page.
function assertAuthRequest(event: IpcMainInvokeEvent, rendererUrl: string) {
  const window = BrowserWindow.fromWebContents(event.sender)
  if (!window || window.isDestroyed() || event.senderFrame !== event.sender.mainFrame) {
    throw new Error("Invalid auth request.")
  }
  const url = new URL(event.senderFrame.url)
  url.hash = ""
  if (url.href !== rendererUrl) throw new Error("Invalid auth request.")
}

function parseTokenOptions(args: unknown[]): { forceRefresh: boolean } {
  if (args.length === 0 || args[0] === undefined) return { forceRefresh: false }
  const [options] = args
  if (args.length !== 1 || typeof options !== "object" || options === null) throw new Error("Invalid auth request.")
  const { forceRefresh } = options as { forceRefresh?: unknown }
  if (forceRefresh !== undefined && typeof forceRefresh !== "boolean") throw new Error("Invalid auth request.")
  return { forceRefresh: forceRefresh ?? false }
}

export function registerAuthIpcHandlers(service: AuthService, rendererUrl: string) {
  const noArgs = (args: unknown[]) => { if (args.length !== 0) throw new Error("Invalid auth request.") }

  ipcMain.handle("auth:get-status", (event, ...args: unknown[]) => {
    assertAuthRequest(event, rendererUrl)
    noArgs(args)
    return service.getSnapshot()
  })
  ipcMain.handle("auth:sign-in", (event, ...args: unknown[]) => {
    assertAuthRequest(event, rendererUrl)
    noArgs(args)
    return service.signIn()
  })
  ipcMain.handle("auth:sign-out", (event, ...args: unknown[]) => {
    assertAuthRequest(event, rendererUrl)
    noArgs(args)
    return service.signOut()
  })
  ipcMain.handle("auth:get-access-token", (event, ...args: unknown[]) => {
    assertAuthRequest(event, rendererUrl)
    return service.getAccessToken(parseTokenOptions(args))
  })

  const unsubscribe = service.subscribe(snapshot => {
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed() && !window.webContents.isDestroyed()) {
        window.webContents.send("auth:status-changed", snapshot)
      }
    }
  })

  return () => {
    unsubscribe()
    for (const channel of CHANNELS) ipcMain.removeHandler(channel)
  }
}
