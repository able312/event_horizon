import { BrowserWindow, ipcMain, type IpcMainInvokeEvent } from "electron"
import type { UpdaterService } from "../services/updaterService.js"

function assertUpdaterRequest(event: IpcMainInvokeEvent, args: unknown[], rendererUrl: string) {
  const window = BrowserWindow.fromWebContents(event.sender)
  if (!window || window.isDestroyed() || event.senderFrame !== event.sender.mainFrame || args.length !== 0) {
    throw new Error("Invalid updater request.")
  }
  const url = new URL(event.senderFrame.url)
  url.hash = ""
  if (url.href !== rendererUrl) throw new Error("Invalid updater request.")
}

export function registerUpdaterIpcHandlers(service: UpdaterService, rendererUrl: string) {
  ipcMain.handle("updater:get-status", (event, ...args: unknown[]) => {
    assertUpdaterRequest(event, args, rendererUrl)
    return service.getStatus()
  })
  ipcMain.handle("updater:restart-and-install", (event, ...args: unknown[]) => {
    assertUpdaterRequest(event, args, rendererUrl)
    service.restartAndInstall()
  })
  const unsubscribe = service.subscribe(snapshot => {
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed() && !window.webContents.isDestroyed()) {
        window.webContents.send("updater:status-changed", snapshot)
      }
    }
  })
  return () => {
    unsubscribe()
    ipcMain.removeHandler("updater:get-status")
    ipcMain.removeHandler("updater:restart-and-install")
  }
}
