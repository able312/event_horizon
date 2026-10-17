export {}
import type { UpdaterApi } from "./updater"
import type { AuthApi } from "./auth"
import type { EventRequestNotificationsApi } from "./notifications"

declare global {
  interface Window {
    api?: { updater: UpdaterApi; auth: AuthApi; eventRequestNotifications?: EventRequestNotificationsApi }
    electron: {
      ipcRenderer: {
        invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
        send: (channel: string, ...args: unknown[]) => void
        on: (channel: string, listener: (...args: unknown[]) => void) => void
        removeListener: (channel: string, listener: (...args: unknown[]) => void) => void
      }
    }
  }
}
