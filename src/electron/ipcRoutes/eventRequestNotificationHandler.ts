import { app, BrowserWindow, ipcMain, Notification, type IpcMainInvokeEvent } from "electron"
import { focusApp } from "../services/authPlatform.js"

const NOTIFY = "event-requests:notify-new"
const NOTIFY_UPDATES = "event-notifications:notify-updates"
const COUNT = "event-requests:set-pending-count"

/** Alert text for teammates' event changes. Written here: the renderer only sends a count. */
export function eventUpdatesNotificationText(count: number) {
  return count === 1
    ? { title: "Event updated", body: "A teammate added or changed an event. See what changed in your Inbox." }
    : { title: `${count} event updates`, body: "Teammates added or changed events. See what changed in your Inbox." }
}

export function registerEventRequestNotificationHandlers(rendererUrl: string, platform = process.platform, reopenInbox?: () => void) {
  // Keep references alive so OS click events can reach the app.
  const notifications = new Set<Notification>()
  function assertRequest(event: IpcMainInvokeEvent) {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window || window.isDestroyed() || event.senderFrame !== event.sender.mainFrame) {
      throw new Error("Invalid notification request.")
    }
    const url = new URL(event.senderFrame.url)
    url.hash = ""
    if (url.href !== rendererUrl) throw new Error("Invalid notification request.")
    return window
  }

  /** Shows an alert whose click focuses the app and opens the Inbox. */
  function showInboxNotification(window: BrowserWindow, content: { title: string; body: string }) {
    if (platform === "win32" && !window.isFocused()) window.flashFrame(true)
    if (!Notification.isSupported()) return
    const notification = new Notification(content)
    notifications.add(notification)
    notification.on("click", () => {
      const target = !window.isDestroyed() && !window.webContents.isDestroyed()
        ? window
        : BrowserWindow.getAllWindows().find(candidate => !candidate.isDestroyed() && !candidate.webContents.isDestroyed())
      if (!target) {
        reopenInbox?.()
        return
      }
      focusApp()
      target.webContents.send("navigate", "/events?view=inbox")
    })
    notification.on("close", () => notifications.delete(notification))
    notification.on("failed", (_event, error: string) => {
      notifications.delete(notification)
      console.error("Inbox notification:", error)
    })
    notification.show()
  }

  ipcMain.handle(NOTIFY, (event, ...args: unknown[]) => {
    const window = assertRequest(event)
    if (args.length !== 0) throw new Error("Invalid notification request.")
    showInboxNotification(window, {
      title: "New event request",
      body: "A new website request is waiting in your Inbox.",
    })
  })

  ipcMain.handle(NOTIFY_UPDATES, (event, ...args: unknown[]) => {
    const window = assertRequest(event)
    const [count] = args
    if (args.length !== 1 || typeof count !== "number" || !Number.isSafeInteger(count) || count < 1) {
      throw new Error("Invalid notification request.")
    }
    showInboxNotification(window, eventUpdatesNotificationText(count))
  })

  ipcMain.handle(COUNT, (event, ...args: unknown[]) => {
    const window = assertRequest(event)
    const [count] = args
    if (args.length !== 1 || typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) {
      throw new Error("Invalid pending request count.")
    }
    if (platform === "darwin") app.dock?.setBadge(count === 0 ? "" : String(count))
    if (platform === "win32" && count === 0) window.flashFrame(false)
  })

  const stopFlashing = () => {
    if (platform === "win32") {
      for (const window of BrowserWindow.getAllWindows()) {
        if (!window.isDestroyed()) window.flashFrame(false)
      }
    }
  }
  // Only the renderer keeps the badge current, so it must not outlive the last window.
  const clearBadge = () => {
    if (platform === "darwin") app.dock?.setBadge("")
  }
  app.on("browser-window-focus", stopFlashing)
  app.on("window-all-closed", clearBadge)
  return () => {
    ipcMain.removeHandler(NOTIFY)
    ipcMain.removeHandler(NOTIFY_UPDATES)
    ipcMain.removeHandler(COUNT)
    app.removeListener("browser-window-focus", stopFlashing)
    app.removeListener("window-all-closed", clearBadge)
    for (const notification of notifications) notification.close()
    notifications.clear()
    clearBadge()
  }
}
