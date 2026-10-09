// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest"
import { AUTH_REDIRECT_URI } from "./authConfig.js"
import { createAuthService, SIGN_IN_ERRORS, SIGN_IN_TIMEOUT_MS, type AuthClient, type CallbackPage } from "./authService.js"

const NOW = 1_000_000_000_000

function token(exp: number) {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url")
  return `${encode({ alg: "RS256" })}.${encode({ sub: "user_1", exp: exp / 1000 })}.sig`
}

function response(email: string, refreshToken: string, expiresAt = NOW + 5 * 60 * 1000) {
  return {
    user: { id: "user_1", email, emailVerified: true, firstName: "Sam", lastName: "Staff", createdAt: "c", updatedAt: "u" },
    accessToken: token(expiresAt),
    refreshToken,
  }
}

function setup(options: { stored?: string | null; clientId?: string | null; encryption?: boolean } = {}) {
  let stored = options.stored ?? null
  let handler: ((url: URL) => Promise<CallbackPage | null>) | null = null
  const close = vi.fn()
  const client = {
    getAuthorizationUrlWithPKCE: vi.fn(async () => ({ url: "https://auth.example/authorize", state: "state-1", codeVerifier: "verifier-1" })),
    authenticateWithCode: vi.fn(async () => response("staff@westlinks.ca", "refresh-1")),
    authenticateWithRefreshToken: vi.fn(async () => response("staff@westlinks.ca", "refresh-2", NOW + 10 * 60 * 1000)),
  } satisfies AuthClient
  const platform = {
    storage: {
      load: vi.fn(() => stored),
      save: vi.fn((json: string) => {
        if (options.encryption === false) return false
        stored = json
        return true
      }),
      clear: vi.fn(() => { stored = null }),
    },
    openExternal: vi.fn(async () => undefined),
    listen: vi.fn(async (next: (url: URL) => Promise<CallbackPage | null>) => { handler = next; return { close } }),
    focusApp: vi.fn(),
    logError: vi.fn(),
  }
  let now = NOW
  const service = createAuthService(options.clientId === undefined ? "client_test" : options.clientId, client, platform, () => now)
  const snapshots: unknown[] = []
  service.subscribe(snapshot => snapshots.push(snapshot))
  return {
    service, client, platform, close, snapshots,
    stored: () => stored,
    callback: (query: string) => handler!(new URL(`http://localhost:42070/callback?${query}`)),
    advance: (ms: number) => { now += ms },
  }
}

async function signedIn() {
  const state = setup()
  await state.service.signIn()
  await state.callback("code=abc&state=state-1")
  return state
}

afterEach(() => { vi.useRealTimers() })

describe("sign-in", () => {
  it("opens the PKCE URL, exchanges the code with the verifier, and stores the session", async () => {
    const state = setup()
    await state.service.signIn()
    expect(state.client.getAuthorizationUrlWithPKCE).toHaveBeenCalledWith({
      provider: "GoogleOAuth", clientId: "client_test", redirectUri: AUTH_REDIRECT_URI,
      providerQueryParams: { prompt: "select_account", hd: "westlinks.ca" },
    })
    expect(state.platform.openExternal).toHaveBeenCalledWith("https://auth.example/authorize")
    expect(state.service.getSnapshot()).toMatchObject({ isAuthenticated: false, isLoading: true, error: null })

    const page = await state.callback("code=abc&state=state-1")
    expect(page).toMatchObject({ success: true })
    expect(state.client.authenticateWithCode).toHaveBeenCalledWith({ clientId: "client_test", code: "abc", codeVerifier: "verifier-1" })
    expect(state.service.getSnapshot()).toMatchObject({ isAuthenticated: true, isLoading: false, user: { email: "staff@westlinks.ca" } })
    expect(JSON.parse(state.stored()!)).toMatchObject({ refreshToken: "refresh-1" })
    expect(state.close).toHaveBeenCalled()
    expect(state.platform.focusApp).toHaveBeenCalled()
  })

  it("rejects a callback with the wrong state without exchanging the code", async () => {
    const state = setup()
    await state.service.signIn()
    expect(await state.callback("code=abc&state=forged")).toMatchObject({ success: false })
    expect(state.client.authenticateWithCode).not.toHaveBeenCalled()
    expect(state.service.getSnapshot()).toMatchObject({ isAuthenticated: false, isLoading: false })
    expect(state.service.getSnapshot().error).toMatch(/expired/)
  })

  it("refuses accounts outside the company domain", async () => {
    const state = setup()
    state.client.authenticateWithCode.mockResolvedValueOnce(response("someone@gmail.com", "refresh-x"))
    await state.service.signIn()
    expect(await state.callback("code=abc&state=state-1")).toMatchObject({ success: false })
    expect(state.service.getSnapshot()).toMatchObject({ isAuthenticated: false, error: SIGN_IN_ERRORS.wrongDomain })
    expect(state.stored()).toBeNull()
  })

  it("reports provider errors and exchange failures", async () => {
    const state = setup()
    await state.service.signIn()
    await state.callback("state=state-1&error=access_denied&error_description=Denied")
    expect(state.service.getSnapshot()).toMatchObject({ isLoading: false, error: "Denied" })

    state.client.authenticateWithCode.mockRejectedValueOnce(new Error("bad code"))
    await state.service.signIn()
    await state.callback("code=abc&state=state-1")
    expect(state.service.getSnapshot()).toMatchObject({ isAuthenticated: false, error: SIGN_IN_ERRORS.failed })
    expect(state.platform.logError).toHaveBeenCalled()
  })

  it("ignores a callback from a superseded attempt", async () => {
    const state = setup()
    await state.service.signIn()
    const first = state.platform.listen.mock.calls[0][0]
    state.client.getAuthorizationUrlWithPKCE.mockResolvedValueOnce({ url: "https://auth.example/2", state: "state-2", codeVerifier: "verifier-2" })
    await state.service.signIn()
    expect(state.close).toHaveBeenCalledTimes(1)
    expect(await first(new URL("http://localhost:42070/callback?code=abc&state=state-1"))).toMatchObject({ success: false })
    expect(state.client.authenticateWithCode).not.toHaveBeenCalled()
    expect(state.service.getSnapshot()).toMatchObject({ isLoading: true })
  })

  it("times out and stops listening", async () => {
    vi.useFakeTimers()
    const state = setup()
    await state.service.signIn()
    vi.advanceTimersByTime(SIGN_IN_TIMEOUT_MS)
    expect(state.service.getSnapshot()).toMatchObject({ isLoading: false, error: SIGN_IN_ERRORS.timedOut })
    expect(state.close).toHaveBeenCalled()
  })

  it("fails closed when no client ID is configured", async () => {
    const state = setup({ clientId: null })
    await state.service.signIn()
    expect(state.client.getAuthorizationUrlWithPKCE).not.toHaveBeenCalled()
    expect(state.service.getSnapshot()).toMatchObject({ isLoading: false, error: SIGN_IN_ERRORS.notConfigured })
  })

  it("recovers when the callback port is unavailable", async () => {
    const state = setup()
    state.platform.listen.mockRejectedValueOnce(Object.assign(new Error("in use"), { code: "EADDRINUSE" }))
    await state.service.signIn()
    expect(state.platform.openExternal).not.toHaveBeenCalled()
    expect(state.service.getSnapshot()).toMatchObject({ isLoading: false, error: SIGN_IN_ERRORS.failed })
  })

  it("keeps the session in memory only when encryption is unavailable", async () => {
    const state = setup({ encryption: false })
    await state.service.signIn()
    await state.callback("code=abc&state=state-1")
    expect(state.service.getSnapshot().isAuthenticated).toBe(true)
    expect(state.stored()).toBeNull()
  })
})

describe("stored sessions", () => {
  it("restores a company session and discards invalid or foreign ones", async () => {
    const { stored } = await signedIn()
    expect(setup({ stored: stored() }).service.getSnapshot()).toMatchObject({ isAuthenticated: true })

    const corrupt = setup({ stored: "{" })
    expect(corrupt.service.getSnapshot().isAuthenticated).toBe(false)
    expect(corrupt.platform.storage.clear).toHaveBeenCalled()

    const foreign = setup({ stored: stored()!.replace("staff@westlinks.ca", "someone@gmail.com") })
    expect(foreign.service.getSnapshot().isAuthenticated).toBe(false)
    expect(foreign.stored()).toBeNull()
  })
})

describe("access tokens", () => {
  it("returns the current token, then refreshes once for concurrent callers near expiry", async () => {
    const state = await signedIn()
    const first = await state.service.getAccessToken()
    expect(first).toBeTruthy()
    expect(state.client.authenticateWithRefreshToken).not.toHaveBeenCalled()

    state.advance(5 * 60 * 1000)
    const [a, b] = await Promise.all([state.service.getAccessToken(), state.service.getAccessToken()])
    expect(a).toBe(b)
    expect(a).not.toBe(first)
    expect(state.client.authenticateWithRefreshToken).toHaveBeenCalledTimes(1)
    expect(state.client.authenticateWithRefreshToken).toHaveBeenCalledWith({ clientId: "client_test", refreshToken: "refresh-1" })
    expect(JSON.parse(state.stored()!)).toMatchObject({ refreshToken: "refresh-2" })
  })

  it("refreshes on demand when Convex rejects the token", async () => {
    const state = await signedIn()
    await state.service.getAccessToken({ forceRefresh: true })
    expect(state.client.authenticateWithRefreshToken).toHaveBeenCalledTimes(1)
  })

  it("signs out when the refresh token is rejected", async () => {
    const state = await signedIn()
    state.client.authenticateWithRefreshToken.mockRejectedValueOnce(Object.assign(new Error("invalid_grant"), { status: 400 }))
    expect(await state.service.getAccessToken({ forceRefresh: true })).toBeNull()
    expect(state.service.getSnapshot()).toMatchObject({ isAuthenticated: false, error: SIGN_IN_ERRORS.expired })
    expect(state.stored()).toBeNull()
  })

  it("keeps the session through network failures while the token is still valid", async () => {
    const state = await signedIn()
    const current = await state.service.getAccessToken()
    state.client.authenticateWithRefreshToken.mockRejectedValue(new TypeError("fetch failed"))
    expect(await state.service.getAccessToken({ forceRefresh: true })).toBe(current)
    state.advance(10 * 60 * 1000)
    expect(await state.service.getAccessToken()).toBeNull()
    expect(state.service.getSnapshot().isAuthenticated).toBe(true)
  })

  it("returns null when signed out", async () => {
    expect(await setup().service.getAccessToken()).toBeNull()
  })
})

describe("sign-out", () => {
  it("clears the session and cancels a pending sign-in", async () => {
    const state = await signedIn()
    await state.service.signIn()
    await state.service.signOut()
    expect(state.service.getSnapshot()).toEqual({ isAuthenticated: false, user: null, isLoading: false, error: null })
    expect(state.stored()).toBeNull()
    expect(state.close).toHaveBeenCalledTimes(2)
  })
})
