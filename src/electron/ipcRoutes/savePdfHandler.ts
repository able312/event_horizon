import { BrowserWindow, dialog, ipcMain } from "electron"
import fs from 'node:fs'
import { logAndThrow } from "./ipcErrors.js"

type GeneratePdfPayload = {
    defaultFileName?: string
}

function resolveDefaultFileName(payload: unknown): string | undefined {
    if (!payload || typeof payload !== "object") return undefined

    const defaultFileName = (payload as GeneratePdfPayload).defaultFileName
    if (typeof defaultFileName !== "string") return undefined

    const trimmed = defaultFileName.trim()
    return trimmed.length > 0 ? trimmed : undefined
}

export const registerPDFGenerationHandler = () => {
    ipcMain.handle("generate-pdf", async (_event, payload?: GeneratePdfPayload) => {
        try {
            const win = BrowserWindow.getFocusedWindow()
            if (!win) throw new Error("No focused window available for PDF generation")

            const defaultFileName = resolveDefaultFileName(payload)

            const result = await dialog.showSaveDialog(win, {
                ...(defaultFileName ? { defaultPath: defaultFileName } : {}),
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
