// electron/menu.ts
import { app, ipcMain, BrowserWindow, Menu, dialog, type MenuItemConstructorOptions } from "electron"
import { isDev } from "./utils.js"
import { prepareIcsImportReview } from "./services/icsImportService.js"
import type { GenerateMenuContext } from "~/definitions/ipc.js"

const windowState = new Map<number, GenerateMenuContext>()
let lastActiveWindowId: number | null = null
const isMac = process.platform === "darwin"

const DEFAULT_GENERATE_MENU_CONTEXT: GenerateMenuContext = {
  view: "other",
  eventId: null,
}

function toGenerateMenuContext(value: unknown): GenerateMenuContext {
  if (!value || typeof value !== "object") return DEFAULT_GENERATE_MENU_CONTEXT

  const candidate = value as { view?: unknown; eventId?: unknown }
  const view = candidate.view === "event-details" ? "event-details" : "other"
  const eventId = typeof candidate.eventId === "string" && candidate.eventId.trim().length > 0
    ? candidate.eventId
    : null

  return { view, eventId }
}

function navigateToPreview(browserWindow: BrowserWindow, pathPrefix: string) {
  const state = windowState.get(browserWindow.id)
  if (!state?.eventId) return
  browserWindow.webContents.send("navigate", `${pathPrefix}/${state.eventId}`)
}

ipcMain.on("generate:active", async (event, data) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) {
    windowState.set(win.id, toGenerateMenuContext(data))
    lastActiveWindowId = win.id
    rebuildAppMenu(win.id)
  }
})

function resolveMenuStateWindowId(targetWindowId?: number): number | null {
  if (typeof targetWindowId === "number") return targetWindowId

  const focusedWin = BrowserWindow.getFocusedWindow()
  if (focusedWin) return focusedWin.id

  return lastActiveWindowId
}

export function rebuildAppMenu(targetWindowId?: number) {
  const stateWindowId = resolveMenuStateWindowId(targetWindowId)
  const currentState = stateWindowId !== null ? windowState.get(stateWindowId) : null
  const canGenerate = currentState?.view === "event-details" && !!currentState?.eventId

  const template: MenuItemConstructorOptions[] = [
  // App menu (macOS only)
  {
    label: app.name,
    visible: isMac,
    submenu: [
      { role: "about" },
      { type: "separator" },
      { role: "services" },
      { type: "separator" },
      { role: "hide" },
      { role: "hideOthers" },
      { role: "unhide" },
      { type: "separator" },
      { role: "quit" },
    ] as MenuItemConstructorOptions[],
  },
  {
    label: "File",
    submenu: [
      {
        label: "Import .ics…",
        click: async (_menuItem, browserWindow) => {
          const targetWindow = browserWindow instanceof BrowserWindow
            ? browserWindow
            : BrowserWindow.getFocusedWindow()

          if (!targetWindow) return

          const pickerResult = await dialog.showOpenDialog(targetWindow, {
            filters: [{ name: "iCalendar", extensions: ["ics"] }],
            properties: ["openFile"],
          })

          if (pickerResult.canceled || pickerResult.filePaths.length === 0) {
            return
          }

          try {
            const reviewPayload = await prepareIcsImportReview(pickerResult.filePaths[0]!)
            targetWindow.webContents.send("navigate", "/events")

            // Give the renderer route a brief moment to mount listeners after navigation.
            setTimeout(() => {
              targetWindow.webContents.send("events:import-ics:review", reviewPayload)
            }, 150)
          } catch (error) {
            console.error("Error preparing ICS review payload:", error)
          }
        },
      },
      { role: "reload"}
    ],
  },
  
  {
    label: "Edit",
    submenu: [
      { role: "copy"},
      { role: "cut"},
      { role: "paste"},
      { role: "selectAll"},
      { type: "separator" },
      { role: "undo"},
      { role: "redo"},
    ]
  },
  {
    label: "View",
    submenu: [
      { role: "togglefullscreen" },
      { type: "separator" },
      { role: "toggleDevTools" },
    ],
  },
  ...(canGenerate
    ? [
        {
          label: "Generate",
          submenu: [
            {
              label: "Generate Timeline",
              click: (_menuItem, browserWindow) => {
                if (!browserWindow || !(browserWindow instanceof BrowserWindow)) return
                navigateToPreview(browserWindow, "/preview/timeline")
              },
            },
            {
              label: "Generate BEO",
              click: (_menuItem, browserWindow) => {
                if (!browserWindow || !(browserWindow instanceof BrowserWindow)) return
                navigateToPreview(browserWindow, "/preview/beo")
              },
            },
            {
              label: "Generate Food BEO",
              click: (_menuItem, browserWindow) => {
                if (!browserWindow || !(browserWindow instanceof BrowserWindow)) return
                navigateToPreview(browserWindow, "/preview/beo-food")
              },
            },
            {
              label: "Generate Financial Report",
              click: (_menuItem, browserWindow) => {
                if (!browserWindow || !(browserWindow instanceof BrowserWindow)) return
                navigateToPreview(browserWindow, "/preview/financial-report")
              },
            },
          ],
        } as MenuItemConstructorOptions,
      ]
    : []),
  // Development menu (only in development mode)
  {
      label: "Developer",
      visible: isDev(),
      submenu: [
          { role: "reload" },
          { role: "forceReload" },
          { role: "toggleDevTools" },
          { role: "inspectElement"}
      ]
  }
] as MenuItemConstructorOptions[]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
