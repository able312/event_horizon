import { app, autoUpdater as nativeUpdater, BrowserWindow, dialog, nativeImage } from 'electron';
import electronUpdater from 'electron-updater';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url'
import { isDev } from './utils.js';
import { registerAllIpcHandlers } from './ipcRoutes/index.js';
import { rebuildAppMenu } from './appMenu.js';
import { initDB } from './db/index.js';
import { createUpdaterService, isUpdaterEnabled } from './services/updaterService.js';
import { createUpdaterLogger } from './services/updaterLogger.js';
import { registerUpdaterIpcHandlers } from './ipcRoutes/updaterHandler.js';

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const resolveWindowIconPath = () => {
    if (isDev()) {
        return path.join(__dirname, '../../src/assets/eventHorizon-256.png')
    }
    return path.join(app.getAppPath(), 'dist-react/icon-512.png')
}

const createWindow = () => {
    const iconPath = resolveWindowIconPath()
    const windowIcon = nativeImage.createFromPath(iconPath)

    const mainWindow = new BrowserWindow({
        backgroundColor: '#ffffff',  // Add this line
        ...(windowIcon.isEmpty() ? {} : { icon: windowIcon }),
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: true,
        },
        trafficLightPosition: {
            x: 15, // Padding from the left
            y: 12  // Padding from the top
        },
        titleBarStyle: 'hidden'
    });

    mainWindow.maximize()

    if (isDev()) {
        console.log("Loading localhost:42069")
        mainWindow.loadURL("http://localhost:42069")
    } else {
        console.log(app.getAppPath(),"/dist-react/index.html")
        mainWindow.loadFile(path.join(app.getAppPath(), "/dist-react/index.html"));
    }
}

app.on("ready", () => {
    try {
        initDB()
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error("Database startup failed:", error)
        dialog.showErrorBox("Database startup failed", `${message}\n\nThe app will close without opening a window.`)
        app.quit()
        return
    }

    registerAllIpcHandlers()

    const { autoUpdater } = electronUpdater
    const logger = createUpdaterLogger(path.join(app.getPath("logs"), "updater.log"))
    autoUpdater.logger = logger
    const updater = createUpdaterService(autoUpdater, nativeUpdater,
        isUpdaterEnabled(app.isPackaged, process.platform, process.arch), logger.error)
    const rendererUrl = isDev() ? "http://localhost:42069/"
        : pathToFileURL(path.join(app.getAppPath(), "dist-react/index.html")).href
    const unregisterUpdater = registerUpdaterIpcHandlers(updater, rendererUrl)
    app.once("will-quit", () => {
        unregisterUpdater()
        updater.stop()
    })

    createWindow();

    rebuildAppMenu()

    updater.start()

    app.on("window-all-closed", () => {
        if (process.platform !== "darwin") app.quit()
    })
})

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow(); // your existing window creation function
  } else {
    BrowserWindow.getAllWindows()[0].show();
  }
});

app.on("browser-window-focus", () => {
    rebuildAppMenu()
})
