import type { AuthSnapshot } from "../../definitions/auth.js"
import { AUTH_REDIRECT_URI, COMPANY_EMAIL_DOMAIN } from "./authConfig.js"
import {
  isCompanyEmail, isRejectedRefresh, needsRefresh, parseCallback, parseStoredSession, toSession,
  type AuthSession,
} from "./authSession.js"

export const SIGN_IN_TIMEOUT_MS = 5 * 60 * 1000

type TokenResponse = Parameters<typeof toSession>[0]

/** The public-client subset of the WorkOS user management API (no API key). */
export interface AuthClient {
  getAuthorizationUrlWithPKCE(options: { provider: "authkit"; clientId: string; redirectUri: string }):
    Promise<{ url: string; state: string; codeVerifier: string }>
  authenticateWithCode(options: { clientId: string; code: string; codeVerifier: string }): Promise<TokenResponse>
  authenticateWithRefreshToken(options: { clientId: string; refreshToken: string }): Promise<TokenResponse>
}

export interface CallbackPage { title: string; message: string; success: boolean }

export interface AuthPlatform {
  /** Encrypted session storage; `save` returns false when encryption is unavailable. */
  storage: { load(): string | null; save(json: string): boolean; clear(): void }
  openExternal(url: string): Promise<void>
  /** Starts the loopback callback server; a null page means 404. */
  listen(handler: (url: URL) => Promise<CallbackPage | null>): Promise<{ close(): void }>
  focusApp(): void
  logError(error: unknown): void
}

export const SIGN_IN_ERRORS = {
  notConfigured: "Sign-in isn't configured for this build of Event Horizon.",
  timedOut: "Sign-in timed out. Try again.",
  wrongDomain: `Sign in with your @${COMPANY_EMAIL_DOMAIN} Google account.`,
  failed: "Sign-in failed. Try again.",
  expired: "Your session has expired. Sign in again.",
} as const

interface SignInAttempt {
  state: string
  codeVerifier: string
  server: { close(): void } | null
  timer: ReturnType<typeof setTimeout> | undefined
}

export function createAuthService(
  clientId: string | null,
  client: AuthClient,
  platform: AuthPlatform,
  now: () => number = Date.now,
) {
  let session = loadSession()
  let pending: SignInAttempt | null = null
  let error: string | null = null
  let refreshing: Promise<AuthSession | null> | null = null
  const subscribers = new Set<(snapshot: AuthSnapshot) => void>()

  function loadSession(): AuthSession | null {
    const json = platform.storage.load()
    const stored = json ? parseStoredSession(json) : null
    if (json && (!stored || !isCompanyEmail(stored.user.email, COMPANY_EMAIL_DOMAIN))) platform.storage.clear()
    return stored && isCompanyEmail(stored.user.email, COMPANY_EMAIL_DOMAIN) ? stored : null
  }

  function getSnapshot(): AuthSnapshot {
    return { isAuthenticated: session !== null, user: session?.user ?? null, isLoading: pending !== null, error }
  }

  function publish() {
    const snapshot = getSnapshot()
    for (const subscriber of subscribers) {
      try { subscriber(snapshot) } catch (err) { platform.logError(err) }
    }
  }

  function setSession(next: AuthSession | null) {
    session = next
    if (!next) {
      platform.storage.clear()
    } else if (!platform.storage.save(JSON.stringify(next))) {
      // Never write tokens unencrypted; the session lasts until the app quits.
      platform.storage.clear()
    }
  }

  function finish(attempt: SignInAttempt, failure: string | null) {
    if (pending !== attempt) return
    clearTimeout(attempt.timer)
    attempt.server?.close()
    pending = null
    error = failure
    publish()
  }

  async function handleRequest(attempt: SignInAttempt, url: URL): Promise<CallbackPage | null> {
    const result = parseCallback(url, attempt.state)
    if (result.kind === "ignore") return null
    if (pending !== attempt) {
      return { title: "Sign-in link expired", message: "Start signing in again from Event Horizon.", success: false }
    }
    if (result.kind === "error") {
      finish(attempt, result.message)
      return { title: "Sign-in failed", message: result.message, success: false }
    }
    try {
      const next = toSession(await client.authenticateWithCode({ clientId: clientId ?? "", code: result.code, codeVerifier: attempt.codeVerifier }))
      if (pending !== attempt) {
        return { title: "Sign-in link expired", message: "Start signing in again from Event Horizon.", success: false }
      }
      if (!isCompanyEmail(next.user.email, COMPANY_EMAIL_DOMAIN)) {
        finish(attempt, SIGN_IN_ERRORS.wrongDomain)
        return { title: "Wrong account", message: SIGN_IN_ERRORS.wrongDomain, success: false }
      }
      setSession(next)
      finish(attempt, null)
      platform.focusApp()
      return { title: "Signed in", message: `Welcome, ${next.user.firstName || next.user.email}. You can return to Event Horizon.`, success: true }
    } catch (err) {
      platform.logError(err)
      finish(attempt, SIGN_IN_ERRORS.failed)
      return { title: "Sign-in failed", message: SIGN_IN_ERRORS.failed, success: false }
    }
  }

  function cancelPending() {
    if (!pending) return
    clearTimeout(pending.timer)
    pending.server?.close()
    pending = null
  }

  async function signIn(): Promise<void> {
    cancelPending()
    if (!clientId) {
      error = SIGN_IN_ERRORS.notConfigured
      publish()
      return
    }
    const attempt: SignInAttempt = { state: "", codeVerifier: "", server: null, timer: undefined }
    pending = attempt
    error = null
    publish()
    try {
      const authorization = await client.getAuthorizationUrlWithPKCE({ provider: "authkit", clientId, redirectUri: AUTH_REDIRECT_URI })
      attempt.state = authorization.state
      attempt.codeVerifier = authorization.codeVerifier
      const server = await platform.listen(url => handleRequest(attempt, url))
      if (pending !== attempt) { server.close(); return }
      attempt.server = server
      attempt.timer = setTimeout(() => finish(attempt, SIGN_IN_ERRORS.timedOut), SIGN_IN_TIMEOUT_MS)
      await platform.openExternal(authorization.url)
    } catch (err) {
      platform.logError(err)
      finish(attempt, SIGN_IN_ERRORS.failed)
    }
  }

  async function signOut(): Promise<void> {
    cancelPending()
    refreshing = null
    setSession(null)
    error = null
    publish()
  }

  function refresh(current: AuthSession): Promise<AuthSession | null> {
    // Refresh tokens are single-use, so concurrent callers share one request.
    if (refreshing) return refreshing
    const request: Promise<AuthSession | null> = client.authenticateWithRefreshToken({ clientId: clientId ?? "", refreshToken: current.refreshToken })
      .then(response => {
        if (session !== current) return session
        const next = toSession(response)
        if (!isCompanyEmail(next.user.email, COMPANY_EMAIL_DOMAIN)) {
          setSession(null)
          error = SIGN_IN_ERRORS.wrongDomain
          publish()
          return null
        }
        setSession(next)
        publish()
        return next
      }, err => {
        if (session !== current) return session
        platform.logError(err)
        if (isRejectedRefresh(err)) {
          setSession(null)
          error = SIGN_IN_ERRORS.expired
          publish()
          return null
        }
        // Network or server trouble: keep the session and retry on the next request.
        return current.expiresAt > now() ? current : null
      })
      .finally(() => { if (refreshing === request) refreshing = null })
    refreshing = request
    return request
  }

  async function getAccessToken(options: { forceRefresh?: boolean } = {}): Promise<string | null> {
    const current = session
    if (!current) return null
    if (!options.forceRefresh && !needsRefresh(current, now())) return current.accessToken
    return (await refresh(current))?.accessToken ?? null
  }

  function subscribe(subscriber: (snapshot: AuthSnapshot) => void): () => void {
    subscribers.add(subscriber)
    return () => { subscribers.delete(subscriber) }
  }

  function stop() {
    cancelPending()
    subscribers.clear()
  }

  return { getSnapshot, signIn, signOut, getAccessToken, subscribe, stop }
}

export type AuthService = ReturnType<typeof createAuthService>
