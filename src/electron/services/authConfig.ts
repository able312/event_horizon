// Public desktop-client settings for WorkOS AuthKit. The app is a public PKCE client:
// no WorkOS API key or other secret ships with it.

/** Loopback port for the sign-in callback; separate from the Vite dev server (42069). */
export const AUTH_CALLBACK_PORT = 42070

/**
 * Must be registered exactly as a Redirect URI on each WorkOS environment. 127.0.0.1, not
 * localhost: WorkOS production only allows plain-HTTP redirects to the loopback IP.
 */
export const AUTH_REDIRECT_URI = `http://127.0.0.1:${AUTH_CALLBACK_PORT}/callback`

/** Only accounts on this domain can use the app; Convex enforces it again server-side. */
export const COMPANY_EMAIL_DOMAIN = "westlinks.ca"

// Client IDs are public identifiers, not secrets. Each must match the WorkOS
// environment configured on the Convex deployment the renderer is built against.
const DEVELOPMENT_CLIENT_ID = "client_01M4EEGGBMS165EF8347V9N9MG"
const PRODUCTION_CLIENT_ID = "client_01M4GQCAWTANP82H2RZ0Y5MV37"

/**
 * Packaged builds use the production client; development runs use the sandbox client.
 * `EVENT_HORIZON_WORKOS_CLIENT_ID` overrides either for local testing.
 */
export function resolveWorkOSClientId(isPackaged: boolean, env: Record<string, string | undefined>): string | null {
  const override = env.EVENT_HORIZON_WORKOS_CLIENT_ID?.trim()
  if (override) return override
  return isPackaged ? PRODUCTION_CLIENT_ID : DEVELOPMENT_CLIENT_ID
}
