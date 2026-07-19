import { app, BrowserWindow, nativeImage } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url'
import { isDev } from './utils.js';
import { registerAllIpcHandlers } from './ipcRoutes/index.js';
import { rebuildAppMenu } from './appMenu.js';
import { initDB } from './db/index.js';

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

app.on("ready", async () => {

    registerAllIpcHandlers()
    

    initDB()

    createWindow();

    rebuildAppMenu()

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
