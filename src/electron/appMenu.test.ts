import { describe, expect, it, vi, beforeEach } from "vitest"
import type { MenuItemConstructorOptions } from "electron"

type AppMenuModule = typeof import("./appMenu")

class MockBrowserWindow {
  static focusedWindow: MockBrowserWindow | null = null
  static senderToWindow = new Map<unknown, MockBrowserWindow>()

  static getFocusedWindow() {
    return MockBrowserWindow.focusedWindow
  }

  static fromWebContents(sender: unknown) {
    return MockBrowserWindow.senderToWindow.get(sender) ?? null
  }

  id: number
  webContents = {
    send: vi.fn(),
  }

  constructor(id: number) {
    this.id = id
  }
}

async function loadAppMenu() {
  vi.resetModules()

  const handlers = new Map<string, (event: { sender: unknown }, data: unknown) => void>()
  const buildFromTemplate = vi.fn((template: MenuItemConstructorOptions[]) => ({ template }))
  const setApplicationMenu = vi.fn()

  const ipcMain = {
    on: vi.fn((channel: string, handler: (event: { sender: unknown }, data: unknown) => void) => {
      handlers.set(channel, handler)
    }),
  }

  vi.doMock("electron", () => ({
    app: { name: "Event Horizon" },
    ipcMain,
    BrowserWindow: MockBrowserWindow,
    Menu: {
      buildFromTemplate,
      setApplicationMenu,
    },
    dialog: {
      showOpenDialog: vi.fn(async () => ({ canceled: true, filePaths: [] })),
    },
  }))

  vi.doMock("./utils.js", () => ({
    isDev: () => false,
  }))

  vi.doMock("./services/icsImportService.js", () => ({
    prepareIcsImportReview: vi.fn(async () => ({})),
  }))

  const appMenu = (await import("./appMenu")) as AppMenuModule

  return {
    appMenu,
    handlers,
    buildFromTemplate,
    setApplicationMenu,
  }
}

function getGenerateMenu(template: MenuItemConstructorOptions[]) {
  return template.find((entry) => entry.label === "Generate")
}

function getViewMenu(template: MenuItemConstructorOptions[]) {
  return template.find((entry) => entry.label === "View")
}

describe("appMenu Generate visibility", () => {
  beforeEach(() => {
    MockBrowserWindow.focusedWindow = null
    MockBrowserWindow.senderToWindow.clear()
  })

  it("always includes View toggleDevTools even when isDev is false", async () => {
    const { appMenu, buildFromTemplate } = await loadAppMenu()
    const win = new MockBrowserWindow(1)
    MockBrowserWindow.focusedWindow = win

    appMenu.rebuildAppMenu()

    const template = buildFromTemplate.mock.calls.at(-1)?.[0] as MenuItemConstructorOptions[]
    const viewMenu = getViewMenu(template)
    const submenu = viewMenu?.submenu as MenuItemConstructorOptions[] | undefined
    const toggleDevTools = submenu?.find((item) => item.role === "toggleDevTools")

    expect(viewMenu).toBeDefined()
    expect(toggleDevTools).toBeDefined()
  })

  it("omits Generate when no event detail context exists", async () => {
    const { appMenu, buildFromTemplate } = await loadAppMenu()
    const win = new MockBrowserWindow(1)
    MockBrowserWindow.focusedWindow = win

    appMenu.rebuildAppMenu()

    const template = buildFromTemplate.mock.calls.at(-1)?.[0] as MenuItemConstructorOptions[]
    const generateMenu = getGenerateMenu(template)

    expect(generateMenu).toBeUndefined()
  })

  it("includes Generate when event detail context is active", async () => {
    const { handlers, buildFromTemplate } = await loadAppMenu()
    const win = new MockBrowserWindow(2)
    const sender = {}
    MockBrowserWindow.focusedWindow = win
    MockBrowserWindow.senderToWindow.set(sender, win)

    const handler = handlers.get("generate:active")
    if (!handler) throw new Error("generate:active handler not registered")

    handler({ sender }, { view: "event-details", eventId: "evt_1" })

    const template = buildFromTemplate.mock.calls.at(-1)?.[0] as MenuItemConstructorOptions[]
    const generateMenu = getGenerateMenu(template)

    expect(generateMenu).toBeDefined()
  })

  it("omits Generate when renderer sends non-detail context", async () => {
    const { handlers, buildFromTemplate } = await loadAppMenu()
    const win = new MockBrowserWindow(3)
    const sender = {}
    MockBrowserWindow.focusedWindow = win
    MockBrowserWindow.senderToWindow.set(sender, win)

    const handler = handlers.get("generate:active")
    if (!handler) throw new Error("generate:active handler not registered")

    handler({ sender }, { view: "other", eventId: null })

    const template = buildFromTemplate.mock.calls.at(-1)?.[0] as MenuItemConstructorOptions[]
    const generateMenu = getGenerateMenu(template)

    expect(generateMenu).toBeUndefined()
  })

  it("does not navigate from Generate click when clicked from a window without state", async () => {
    const { handlers, buildFromTemplate } = await loadAppMenu()
    const win = new MockBrowserWindow(4)
    const unknownWin = new MockBrowserWindow(10)
    const sender = {}
    MockBrowserWindow.focusedWindow = win
    MockBrowserWindow.senderToWindow.set(sender, win)

    const handler = handlers.get("generate:active")
    if (!handler) throw new Error("generate:active handler not registered")
    handler({ sender }, { view: "event-details", eventId: "evt_1" })

    const template = buildFromTemplate.mock.calls.at(-1)?.[0] as MenuItemConstructorOptions[]
    const generateMenu = getGenerateMenu(template)
    if (!generateMenu) throw new Error("Generate menu not found")
    const timelineItem = (generateMenu.submenu as MenuItemConstructorOptions[]).find(
      (item) => item.label === "Generate Timeline",
    )
    if (!timelineItem?.click) throw new Error("Generate Timeline item not found")

    timelineItem.click({} as never, unknownWin as never, {} as never)

    expect(unknownWin.webContents.send).not.toHaveBeenCalled()
  })

  it("navigates to correct preview routes when event id exists", async () => {
    const { handlers, buildFromTemplate } = await loadAppMenu()
    const win = new MockBrowserWindow(5)
    const sender = {}
    MockBrowserWindow.focusedWindow = win
    MockBrowserWindow.senderToWindow.set(sender, win)

    const handler = handlers.get("generate:active")
    if (!handler) throw new Error("generate:active handler not registered")
    handler({ sender }, { view: "event-details", eventId: "evt_1" })

    const template = buildFromTemplate.mock.calls.at(-1)?.[0] as MenuItemConstructorOptions[]
    const generateMenu = getGenerateMenu(template)
    if (!generateMenu) throw new Error("Generate menu not found")
    const submenu = generateMenu.submenu as MenuItemConstructorOptions[]

    const timelineItem = submenu.find((item) => item.label === "Generate Timeline")
    const beoItem = submenu.find((item) => item.label === "Generate BEO")
    const foodBeoItem = submenu.find((item) => item.label === "Generate Food BEO")
    const financialItem = submenu.find((item) => item.label === "Generate Financial Report")

    if (!timelineItem?.click || !beoItem?.click || !foodBeoItem?.click || !financialItem?.click) {
      throw new Error("One or more Generate submenu items not found")
    }

    timelineItem.click({} as never, win as never, {} as never)
    beoItem.click({} as never, win as never, {} as never)
    foodBeoItem.click({} as never, win as never, {} as never)
    financialItem.click({} as never, win as never, {} as never)

    expect(win.webContents.send).toHaveBeenNthCalledWith(1, "navigate", "/preview/timeline/evt_1")
    expect(win.webContents.send).toHaveBeenNthCalledWith(2, "navigate", "/preview/beo/evt_1")
    expect(win.webContents.send).toHaveBeenNthCalledWith(3, "navigate", "/preview/beo-food/evt_1")
    expect(win.webContents.send).toHaveBeenNthCalledWith(4, "navigate", "/preview/financial-report/evt_1")
  })

  it("keeps Generate when focused window is null but last active window is event-details", async () => {
    const { handlers, appMenu, buildFromTemplate } = await loadAppMenu()
    const win = new MockBrowserWindow(6)
    const sender = {}
    MockBrowserWindow.focusedWindow = win
    MockBrowserWindow.senderToWindow.set(sender, win)

    const handler = handlers.get("generate:active")
    if (!handler) throw new Error("generate:active handler not registered")
    handler({ sender }, { view: "event-details", eventId: "evt_1" })

    MockBrowserWindow.focusedWindow = null
    appMenu.rebuildAppMenu()

    const template = buildFromTemplate.mock.calls.at(-1)?.[0] as MenuItemConstructorOptions[]
    const generateMenu = getGenerateMenu(template)
    expect(generateMenu).toBeDefined()
  })

  it("omits Generate when focused window is null and last active state is non-detail", async () => {
    const { handlers, appMenu, buildFromTemplate } = await loadAppMenu()
    const win = new MockBrowserWindow(7)
    const sender = {}
    MockBrowserWindow.focusedWindow = win
    MockBrowserWindow.senderToWindow.set(sender, win)

    const handler = handlers.get("generate:active")
    if (!handler) throw new Error("generate:active handler not registered")
    handler({ sender }, { view: "other", eventId: null })

    MockBrowserWindow.focusedWindow = null
    appMenu.rebuildAppMenu()

    const template = buildFromTemplate.mock.calls.at(-1)?.[0] as MenuItemConstructorOptions[]
    const generateMenu = getGenerateMenu(template)
    expect(generateMenu).toBeUndefined()
  })

  it("uses explicit targetWindowId when rebuilding menu", async () => {
    const { handlers, appMenu, buildFromTemplate } = await loadAppMenu()
    const winDetail = new MockBrowserWindow(8)
    const winOther = new MockBrowserWindow(9)
    const senderDetail = {}
    const senderOther = {}

    MockBrowserWindow.senderToWindow.set(senderDetail, winDetail)
    MockBrowserWindow.senderToWindow.set(senderOther, winOther)
    MockBrowserWindow.focusedWindow = winOther

    const handler = handlers.get("generate:active")
    if (!handler) throw new Error("generate:active handler not registered")

    handler({ sender: senderDetail }, { view: "event-details", eventId: "evt_1" })
    handler({ sender: senderOther }, { view: "other", eventId: null })

    appMenu.rebuildAppMenu(winDetail.id)

    const template = buildFromTemplate.mock.calls.at(-1)?.[0] as MenuItemConstructorOptions[]
    const generateMenu = getGenerateMenu(template)
    expect(generateMenu).toBeDefined()
  })
})
