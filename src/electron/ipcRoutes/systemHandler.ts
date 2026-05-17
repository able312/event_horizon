import { ipcMain, shell } from "electron"
import { logAndThrow } from "./ipcErrors.js"

const ALLOWED_EXTERNAL_ORIGINS = new Set(["https://calendar.google.com"])

function assertAllowedExternalUrl(rawUrl: string): URL {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new Error("Invalid external URL")
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Only https external URLs are allowed")
  }

  if (!ALLOWED_EXTERNAL_ORIGINS.has(parsed.origin)) {
    throw new Error(`External URL origin not allowed: ${parsed.origin}`)
  }

  return parsed
}

export const registerSystemIpcHandlers = () => {
  ipcMain.handle("system:open-external", async (_event, rawUrl: string) => {
    try {
      const url = assertAllowedExternalUrl(rawUrl)
      await shell.openExternal(url.toString())
    } catch (err) {
      logAndThrow("Error opening external URL:", err)
    }
  })
}
