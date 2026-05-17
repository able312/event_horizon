import { BrowserWindow, dialog, ipcMain } from "electron"
import fs from 'node:fs'
import { logAndThrow } from "./ipcErrors.js"

export const registerPDFGenerationHandler = () => {
    ipcMain.handle("generate-pdf", async () => {
        try {
            const win = BrowserWindow.getFocusedWindow()
            if (!win) throw new Error("No focused window available for PDF generation")

            const result = await dialog.showSaveDialog(win, {
                filters: [{ name: "PDF Document", extensions: ["pdf"]}]
            })

            if (result.canceled || !result.filePath) {
                return false
            }

            const pdfBuffer = await win.webContents.printToPDF({})

            await fs.promises.writeFile(result.filePath, pdfBuffer)

            return true

        } catch (err) {
            logAndThrow("Error generating PDF:", err)
        }
    })
}
