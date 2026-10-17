import { contextBridge, ipcRenderer } from "electron"
import type { UpdaterApi, UpdaterSnapshot } from "../definitions/updater.js"
import type { EventRequestNotificationsApi } from "../definitions/notifications.js"
import type { AuthApi, AuthSnapshot } from "../definitions/auth.js"

const updaterApi: UpdaterApi = {
  getStatus: () => ipcRenderer.invoke("updater:get-status"),
  restartAndInstall: () => ipcRenderer.invoke("updater:restart-and-install"),
  onStatusChanged: listener => {
    const wrapped = (_event: Electron.IpcRendererEvent, snapshot: UpdaterSnapshot) => listener(snapshot)
    ipcRenderer.on("updater:status-changed", wrapped)
    return () => { ipcRenderer.removeListener("updater:status-changed", wrapped) }
  },
}

const authApi: AuthApi = {
  getStatus: () => ipcRenderer.invoke("auth:get-status"),
  signIn: () => ipcRenderer.invoke("auth:sign-in"),
  signOut: () => ipcRenderer.invoke("auth:sign-out"),
  getAccessToken: options => ipcRenderer.invoke("auth:get-access-token", options),
  onStatusChanged: listener => {
    const wrapped = (_event: Electron.IpcRendererEvent, snapshot: AuthSnapshot) => listener(snapshot)
    ipcRenderer.on("auth:status-changed", wrapped)
    return () => { ipcRenderer.removeListener("auth:status-changed", wrapped) }
  },
}

const eventRequestNotifications: EventRequestNotificationsApi = {
  notifyNewEventRequest: () => ipcRenderer.invoke("event-requests:notify-new"),
  setPendingCount: count => ipcRenderer.invoke("event-requests:set-pending-count", count),
}

contextBridge.exposeInMainWorld("api", { updater: updaterApi, auth: authApi, eventRequestNotifications })

const ALLOWED_INVOKE_CHANNELS = new Set([
  "generate-pdf",
  "system:open-external",
  "events:import-ics:open",
])

const ALLOWED_SEND_CHANNELS = new Set([
  "generate:active",
])

const ALLOWED_ON_CHANNELS = new Set([
  "events:import-ics:review",
  "navigate",
])

const listenerMap = new Map<string, Map<(...args: unknown[]) => void, (...args: unknown[]) => void>>()

function assertAllowed(channel: string, allowed: Set<string>, apiName: string) {
  if (!allowed.has(channel)) {
    throw new Error(`Blocked IPC ${apiName} channel: ${channel}`)
  }
}

function getChannelListenerMap(channel: string) {
  const existing = listenerMap.get(channel)
  if (existing) return existing
  const created = new Map<(...args: unknown[]) => void, (...args: unknown[]) => void>()
  listenerMap.set(channel, created)
  return created
}

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    invoke: (channel: string, ...args: unknown[]) => {
      assertAllowed(channel, ALLOWED_INVOKE_CHANNELS, "invoke")
      return ipcRenderer.invoke(channel, ...args)
    },
    send: (channel: string, ...args: unknown[]) => {
      assertAllowed(channel, ALLOWED_SEND_CHANNELS, "send")
      ipcRenderer.send(channel, ...args)
    },
    on: (channel: string, listener: (...args: unknown[]) => void) => {
      assertAllowed(channel, ALLOWED_ON_CHANNELS, "on")
      const channelListeners = getChannelListenerMap(channel)
      const existingWrapped = channelListeners.get(listener)
      if (existingWrapped) {
        return existingWrapped
      }
      const wrappedListener = (_event: unknown, ...args: unknown[]) => listener(...args)
      channelListeners.set(listener, wrappedListener)
      return ipcRenderer.on(channel, wrappedListener)
    },
    removeListener: (channel: string, listener: (...args: unknown[]) => void) => {
      assertAllowed(channel, ALLOWED_ON_CHANNELS, "removeListener")
      const channelListeners = listenerMap.get(channel)
      const wrappedListener = channelListeners?.get(listener)
      if (!wrappedListener) return
      ipcRenderer.removeListener(channel, wrappedListener)
      channelListeners?.delete(listener)
    },
  },
})
