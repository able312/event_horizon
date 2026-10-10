import { createServer } from "node:http"
import fs from "node:fs"
import path from "node:path"
import { app, BrowserWindow, safeStorage, shell } from "electron"
import { WorkOS } from "@workos-inc/node"
import { AUTH_CALLBACK_PORT, AUTH_REDIRECT_URI } from "./authConfig.js"
import type { AuthClient, AuthPlatform, CallbackPage } from "./authService.js"

/** A public (PKCE-only) WorkOS client; no API key ships with the app. */
export function createWorkOSAuthClient(clientId: string | null): AuthClient {
  return new WorkOS({ clientId: clientId ?? "unconfigured" }).userManagement
}

function sessionPath() {
  return path.join(app.getPath("userData"), "auth-session.bin")
}

const storage: AuthPlatform["storage"] = {
  load() {
    try {
      if (!fs.existsSync(sessionPath()) || !safeStorage.isEncryptionAvailable()) return null
      return safeStorage.decryptString(fs.readFileSync(sessionPath()))
    } catch {
      return null
    }
  },
  save(json) {
    if (!safeStorage.isEncryptionAvailable()) return false
    fs.writeFileSync(sessionPath(), safeStorage.encryptString(json), { mode: 0o600 })
    return true
  },
  clear() {
    fs.rmSync(sessionPath(), { force: true })
  },
}

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, char => `&#${char.charCodeAt(0)};`)
}

function renderPage({ title, message, success }: CallbackPage) {
  const color = success ? "#10b981" : "#ef4444"
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f3f4f6}
.card{background:#fff;padding:48px;border-radius:12px;text-align:center;box-shadow:0 4px 6px -1px rgb(0 0 0/.1);max-width:400px}
h1{color:${color};margin:0 0 16px;font-size:24px}p{color:#4b5563;margin:0}</style></head>
<body><div class="card"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p></div></body></html>`
}

/**
 * Serves the registered `http://127.0.0.1:<port>/callback` redirect on IPv4 loopback only.
 * The redirect names the IP rather than localhost: WorkOS production rejects localhost
 * redirects but allows 127.0.0.1 for native apps (RFC 8252), and browsers never resolve it to IPv6.
 */
async function listen(handler: (url: URL) => Promise<CallbackPage | null>) {
  const server = createServer(async (req, res) => {
    const page = req.method === "GET" ? await handler(new URL(req.url ?? "/", AUTH_REDIRECT_URI)) : null
    if (!page) {
      res.writeHead(404).end("Not Found")
      return
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }).end(renderPage(page))
  })
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject)
    server.listen(AUTH_CALLBACK_PORT, "127.0.0.1", () => resolve())
  })
  return { close: () => { server.close() } }
}

function focusApp() {
  const window = BrowserWindow.getAllWindows()[0]
  if (!window) return
  if (window.isMinimized()) window.restore()
  window.show()
  window.focus()
  app.focus({ steal: true })
}

export const electronAuthPlatform: AuthPlatform = {
  storage,
  openExternal: url => shell.openExternal(url),
  listen,
  focusApp,
  logError: error => console.error("Auth:", error),
}
