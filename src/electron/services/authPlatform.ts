import { createServer, type Server } from "node:http"
import fs from "node:fs"
import path from "node:path"
import { app, BrowserWindow, safeStorage, shell } from "electron"
import { WorkOS } from "@workos-inc/node"
import { AUTH_CALLBACK_PORT } from "./authConfig.js"
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

function listenOn(server: Server, host: string) {
  return new Promise<boolean>((resolve, reject) => {
    server.once("error", (error: NodeJS.ErrnoException) => {
      // Machines without IPv6 can't bind ::1; IPv4 alone still serves localhost.
      if (host === "::1" && (error.code === "EADDRNOTAVAIL" || error.code === "EAFNOSUPPORT")) resolve(false)
      else reject(error)
    })
    server.listen(AUTH_CALLBACK_PORT, host, () => resolve(true))
  })
}

/**
 * Serves the registered `http://localhost:<port>/callback` redirect on loopback only,
 * on both IPv4 and IPv6 because browsers may resolve localhost to either.
 */
async function listen(handler: (url: URL) => Promise<CallbackPage | null>) {
  const servers = ["127.0.0.1", "::1"].map(() => createServer(async (req, res) => {
    const page = req.method === "GET" ? await handler(new URL(req.url ?? "/", `http://localhost:${AUTH_CALLBACK_PORT}`)) : null
    if (!page) {
      res.writeHead(404).end("Not Found")
      return
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }).end(renderPage(page))
  }))
  const close = () => { for (const server of servers) server.close() }
  try {
    await listenOn(servers[0], "127.0.0.1")
    await listenOn(servers[1], "::1")
  } catch (error) {
    close()
    throw error
  }
  return { close }
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
