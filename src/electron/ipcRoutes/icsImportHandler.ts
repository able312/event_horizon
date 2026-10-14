import { BrowserWindow, dialog, ipcMain } from "electron"
import { parseIcsImportFile } from "../services/icsImportService.js"

/** Picks an .ics file and sends its parsed rows to the window's import review dialog. */
export async function openIcsImport(targetWindow: BrowserWindow): Promise<void> {
  const pickerResult = await dialog.showOpenDialog(targetWindow, {
    filters: [{ name: "iCalendar", extensions: ["ics"] }],
    properties: ["openFile"],
  })

  if (pickerResult.canceled || pickerResult.filePaths.length === 0) {
    return
  }

  try {
    const parsedPayload = await parseIcsImportFile(pickerResult.filePaths[0]!)
    targetWindow.webContents.send("navigate", "/events")

    // Give the renderer route a brief moment to mount listeners after navigation.
    setTimeout(() => {
      targetWindow.webContents.send("events:import-ics:review", parsedPayload)
    }, 150)
  } catch (error) {
    console.error("Error parsing ICS file:", error)
  }
}

export const registerIcsImportIpcHandlers = () => {
  // The File menu is hidden on Windows, so the calendar sidebar opens the same picker.
  ipcMain.handle("events:import-ics:open", async (event) => {
    const targetWindow = BrowserWindow.fromWebContents(event.sender)
    if (targetWindow) await openIcsImport(targetWindow)
  })
}
