import { WorkOS } from '@workos-inc/node'
import { shell, safeStorage, app, BrowserWindow } from 'electron'
import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'http'
import { URL } from 'url'
import path from 'path'
import fs from 'fs'

// WorkOS User type from SDK
interface WorkOSUser {
  id: string
  email: string
  emailVerified: boolean
  profilePictureUrl: string | null
  firstName: string | null
  lastName: string | null
  createdAt: string
  updatedAt: string
}

export interface AuthSession {
  user: WorkOSUser
  accessToken: string
  refreshToken: string
  expiresAt: number
}

export interface AuthServiceSnapshot {
  isAuthenticated: boolean
  user: WorkOSUser | null
  isLoading: boolean
}

export interface AuthService {
  getSnapshot(): AuthServiceSnapshot
  signIn(): Promise<void>
  signOut(): Promise<void>
  handleCallback(code: string): Promise<void>
  getAccessToken(): Promise<string | null>
  subscribe(listener: (snapshot: AuthServiceSnapshot) => void): () => void
  stop(): void
}

const WORKOS_API_KEY = process.env.WORKOS_API_KEY ?? ''
const WORKOS_CLIENT_ID = process.env.WORKOS_CLIENT_ID ?? ''
const WORKOS_REDIRECT_URI = process.env.WORKOS_REDIRECT_URI ?? 'http://localhost:42069/callback'

// Auth callback server port - separate from the dev server
const AUTH_CALLBACK_PORT = 42070

function getStoragePath(): string {
  return path.join(app.getPath('userData'), 'auth-session.encrypted')
}

function saveSession(session: AuthSession): void {
  const sessionJson = JSON.stringify(session)
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(sessionJson)
    fs.writeFileSync(getStoragePath(), encrypted)
  } else {
    // Fallback for systems without keychain (rare)
    fs.writeFileSync(getStoragePath(), sessionJson)
  }
}

function loadSession(): AuthSession | null {
  const storagePath = getStoragePath()
  if (!fs.existsSync(storagePath)) {
    return null
  }
  try {
    const data = fs.readFileSync(storagePath)
    if (safeStorage.isEncryptionAvailable()) {
      const decrypted = safeStorage.decryptString(data)
      return JSON.parse(decrypted) as AuthSession
    } else {
      return JSON.parse(data.toString()) as AuthSession
    }
  } catch {
    // Corrupted or invalid session file
    fs.unlinkSync(storagePath)
    return null
  }
}

function clearSession(): void {
  const storagePath = getStoragePath()
  if (fs.existsSync(storagePath)) {
    fs.unlinkSync(storagePath)
  }
}

export function createAuthService(): AuthService {
  const workos = new WorkOS(WORKOS_API_KEY, { clientId: WORKOS_CLIENT_ID })

  let currentSession: AuthSession | null = loadSession()
  let isLoading = false
  let callbackServer: Server | null = null
  const listeners = new Set<(snapshot: AuthServiceSnapshot) => void>()

  function getSnapshot(): AuthServiceSnapshot {
    return {
      isAuthenticated: currentSession !== null && currentSession.expiresAt > Date.now(),
      user: currentSession?.user ?? null,
      isLoading,
    }
  }

  function notifyListeners(): void {
    const snapshot = getSnapshot()
    for (const listener of listeners) {
      listener(snapshot)
    }
  }

  function setLoading(loading: boolean): void {
    isLoading = loading
    notifyListeners()
  }

  function focusMainWindow(): void {
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      const mainWindow = windows[0]
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  }

  async function signIn(): Promise<void> {
    if (isLoading) return

    setLoading(true)

    try {
      // Start callback server if not running
      if (!callbackServer) {
        await startCallbackServer()
      }

      // Generate authorization URL - use our callback server port
      const callbackUri = `http://localhost:${AUTH_CALLBACK_PORT}/callback`
      const authorizationUrl = workos.userManagement.getAuthorizationUrl({
        provider: 'authkit',
        clientId: WORKOS_CLIENT_ID,
        redirectUri: callbackUri,
      })

      // Open browser to sign in
      await shell.openExternal(authorizationUrl)
    } catch (error) {
      setLoading(false)
      throw error
    }
  }

  async function startCallbackServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
        const url = new URL(req.url ?? '/', `http://localhost:${AUTH_CALLBACK_PORT}`)

        // Handle callback
        if (url.pathname === '/callback') {
          const code = url.searchParams.get('code')
          const error = url.searchParams.get('error')
          const errorDescription = url.searchParams.get('error_description')

          if (error) {
            res.writeHead(200, { 'Content-Type': 'text/html' })
            res.end(createHtmlResponse('Authentication Failed', errorDescription || error, false))
            setLoading(false)
            return
          }

          if (code) {
            try {
              await handleCallback(code)
              res.writeHead(200, { 'Content-Type': 'text/html' })
              const userName = currentSession?.user.firstName || currentSession?.user.email || 'there'
              res.end(createHtmlResponse('Authentication Successful!', `Welcome, ${userName}!`, true))
              focusMainWindow()
            } catch (err) {
              console.error('Auth code exchange failed:', err)
              res.writeHead(200, { 'Content-Type': 'text/html' })
              res.end(createHtmlResponse('Authentication Failed', 'Failed to complete authentication. Please try again.', false))
              setLoading(false)
            }
            return
          }
        }

        // Handle login route (Initiate login URI)
        if (url.pathname === '/login') {
          const callbackUri = `http://localhost:${AUTH_CALLBACK_PORT}/callback`
          const authorizationUrl = workos.userManagement.getAuthorizationUrl({
            provider: 'authkit',
            clientId: WORKOS_CLIENT_ID,
            redirectUri: callbackUri,
          })
          res.writeHead(302, { Location: authorizationUrl })
          res.end()
          return
        }

        // For any other path, return 404
        res.writeHead(404)
        res.end('Not Found')
      })

      server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          // Port already in use, likely from a previous session
          console.log('Auth callback server port already in use, assuming it is running')
          resolve()
        } else {
          reject(err)
        }
      })

      server.listen(AUTH_CALLBACK_PORT, '127.0.0.1', () => {
        console.log(`Auth callback server listening on port ${AUTH_CALLBACK_PORT}`)
        callbackServer = server
        resolve()
      })
    })
  }

  function createHtmlResponse(title: string, message: string, success: boolean): string {
    const color = success ? '#10b981' : '#ef4444'
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: #f3f4f6;
            }
            .card {
              background: white;
              padding: 48px;
              border-radius: 12px;
              text-align: center;
              box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
              max-width: 400px;
            }
            h1 { color: ${color}; margin: 0 0 16px; font-size: 24px; }
            p { color: #4b5563; margin: 0 0 24px; }
            .hint { color: #9ca3af; font-size: 14px; margin: 0; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>${title}</h1>
            <p>${message}</p>
            <p class="hint">You can close this window and return to Event Horizon.</p>
          </div>
          ${success ? '<script>setTimeout(() => window.close(), 2000);</script>' : ''}
        </body>
      </html>
    `
  }

  async function handleCallback(code: string): Promise<void> {
    const callbackUri = `http://localhost:${AUTH_CALLBACK_PORT}/callback`
    const authResponse = await workos.userManagement.authenticateWithCode({
      clientId: WORKOS_CLIENT_ID,
      code,
    })

    // Calculate expiration (default 1 hour from now)
    const expiresAt = Date.now() + 60 * 60 * 1000

    currentSession = {
      user: authResponse.user as WorkOSUser,
      accessToken: authResponse.accessToken,
      refreshToken: authResponse.refreshToken,
      expiresAt,
    }

    saveSession(currentSession)
    setLoading(false)
  }

  async function signOut(): Promise<void> {
    currentSession = null
    clearSession()
    notifyListeners()
  }

  async function getAccessToken(): Promise<string | null> {
    if (!currentSession) return null

    // Check if token is expired or expiring soon (within 5 minutes)
    if (currentSession.expiresAt < Date.now() + 5 * 60 * 1000) {
      // Try to refresh the token
      try {
        const refreshResponse = await workos.userManagement.authenticateWithRefreshToken({
          clientId: WORKOS_CLIENT_ID,
          refreshToken: currentSession.refreshToken,
        })

        currentSession = {
          ...currentSession,
          accessToken: refreshResponse.accessToken,
          refreshToken: refreshResponse.refreshToken,
          expiresAt: Date.now() + 60 * 60 * 1000,
        }

        saveSession(currentSession)
        notifyListeners()
      } catch {
        // Refresh failed, clear session
        await signOut()
        return null
      }
    }

    return currentSession.accessToken
  }

  function subscribe(listener: (snapshot: AuthServiceSnapshot) => void): () => void {
    listeners.add(listener)
    // Immediately notify with current state
    listener(getSnapshot())
    return () => {
      listeners.delete(listener)
    }
  }

  function stop(): void {
    if (callbackServer) {
      callbackServer.close()
      callbackServer = null
    }
  }

  return {
    getSnapshot,
    signIn,
    signOut,
    handleCallback,
    getAccessToken,
    subscribe,
    stop,
  }
}
