export {}
import type { UpdaterApi } from "./updater"
import type { AuthApi } from "./auth"

declare global {
  interface Window {
    api?: { updater: UpdaterApi; auth: AuthApi }
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
