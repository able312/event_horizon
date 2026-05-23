import { contextBridge, ipcRenderer } from "electron"

const ALLOWED_INVOKE_CHANNELS = new Set([
  "beverage-items:delete",
  "beverage-items:get-by-event",
  "beverage-items:patch",
  "beverage-items:post",
  "cart-details:delete",
  "cart-details:get-by-event-id",
  "cart-details:get-or-create-by-event-id",
  "cart-details:get-many",
  "cart-details:patch",
  "cart-details:post",
  "db-stats:get",
  "events:delete",
  "events:get-by-id",
  "events:get-by-month",
  "events:get-many",
  "events:search",
  "events:get-unscheduled",
  "events:import-ics:commit",
  "events:patch",
  "events:post",
  "food-items:delete",
  "food-items:get-by-event",
  "food-items:patch",
  "food-items:post",
  "generate-pdf",
  "menuOfChargeItems:delete",
  "menuOfChargeItems:get-many",
  "menuOfChargeItems:get-many-by-event-id",
  "menuOfChargeItems:patch",
  "menuOfChargeItems:post",
  "payments:delete",
  "payments:get-many",
  "payments:get-many-by-event-id",
  "payments:patch",
  "payments:post",
  "system:open-external",
  "timeblocks:delete",
  "timeblocks:get-by-event-and-section",
  "timeblocks:get-all-timeline-blocks",
  "timeblocks:patch",
  "timeblocks:post",
  "tournament-details:delete",
  "tournament-details:get-by-event-id",
  "tournament-details:get-or-create-by-event-id",
  "tournament-details:get-many",
  "tournament-details:patch",
  "tournament-details:post",
  "vendor-items:delete",
  "vendor-items:get-by-event",
  "vendor-items:patch",
  "vendor-items:post",
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
