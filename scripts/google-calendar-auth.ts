// One-time sign-in for the Google Calendar sync (docs/GOOGLE_CALENDAR_SETUP.md).
// Run it signed in to the browser as the Clubhouse account:
//   npm run google-calendar:auth
// It opens Google's consent page for a "Desktop app" OAuth client, receives the code on a
// loopback port (PKCE + state), and prints the refresh token with the commands that store it
// as a Convex env var. Nothing is written to disk.
import { spawn } from "node:child_process"
import { createHash, randomBytes } from "node:crypto"
import { createServer, type Server } from "node:http"
import { resolve } from "node:path"
import { createInterface } from "node:readline/promises"
import { fileURLToPath } from "node:url"

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
const TOKEN_URL = "https://oauth2.googleapis.com/token"
const SCOPE = "https://www.googleapis.com/auth/calendar.events"
const HOSTED_DOMAIN = "westlinks.ca"
const TIMEOUT_MS = 5 * 60_000

const DONE_PAGE = `<!doctype html><meta charset="utf-8"><title>Event Horizon</title>
<body style="font-family:system-ui,sans-serif;margin:3rem"><p>Signed in. You can close this tab and go back to the terminal.</p></body>`
const FAILED_PAGE = `<!doctype html><meta charset="utf-8"><title>Event Horizon</title>
<body style="font-family:system-ui,sans-serif;margin:3rem"><p>Sign-in didn't complete. Check the terminal, then close this tab.</p></body>`

async function readSetting(name: string, label: string): Promise<string> {
  const fromEnv = process.env[name]?.trim()
  if (fromEnv) return fromEnv
  const prompt = createInterface({ input: process.stdin, output: process.stdout })
  try {
    const value = (await prompt.question(`${label} (or set ${name}): `)).trim()
    if (!value) throw new Error(`${label} is required`)
    return value
  } finally {
    prompt.close()
  }
}

function base64Url(bytes: Buffer): string {
  return bytes.toString("base64url")
}

/** Best effort: the URL is printed too, so a missing opener is not an error. */
function openInBrowser(url: string): void {
  const [command, args] =
    process.platform === "darwin" ? ["open", [url]]
    // explorer.exe rather than `cmd /c start`, so cmd never parses the `&` in the URL
    : process.platform === "win32" ? ["explorer.exe", [url]]
    : ["xdg-open", [url]]
  try {
    const child = spawn(command, args, { stdio: "ignore", detached: true })
    child.on("error", () => {})
    child.unref()
  } catch {
    // ignore; the user can open the printed URL
  }
}

function listen(server: Server): Promise<number> {
  return new Promise((resolveListen, reject) => {
    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      if (address && typeof address === "object") resolveListen(address.port)
      else reject(new Error("Could not read the local server port"))
    })
  })
}

/** Waits for Google to redirect back with ?code=…&state=…; anything else on the port gets a 404. */
function waitForCode(server: Server, expectedState: string): Promise<string> {
  return new Promise((resolveCode, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timed out after 5 minutes waiting for the Google sign-in")), TIMEOUT_MS)
    server.on("request", (request, response) => {
      const url = new URL(request.url ?? "/", "http://127.0.0.1")
      if (request.method !== "GET" || url.pathname !== "/") {
        response.writeHead(404).end()
        return
      }
      const fail = (message: string) => {
        response.writeHead(400, { "Content-Type": "text/html; charset=utf-8" }).end(FAILED_PAGE)
        clearTimeout(timeout)
        reject(new Error(message))
      }
      if (url.searchParams.get("state") !== expectedState) return fail("Sign-in response had the wrong state; start again")
      const error = url.searchParams.get("error")
      if (error) return fail(`Google returned an error: ${error}`)
      const code = url.searchParams.get("code")
      if (!code) return fail("Sign-in response had no code")
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(DONE_PAGE)
      clearTimeout(timeout)
      resolveCode(code)
    })
  })
}

async function exchangeCode(params: { clientId: string; clientSecret: string; code: string; verifier: string; redirectUri: string }): Promise<string> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: params.clientId,
      client_secret: params.clientSecret,
      code: params.code,
      code_verifier: params.verifier,
      grant_type: "authorization_code",
      redirect_uri: params.redirectUri,
    }).toString(),
  })
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) {
    const detail = typeof data.error_description === "string" ? data.error_description : String(data.error ?? response.status)
    throw new Error(`Token exchange failed: ${detail}`)
  }
  const scopes = typeof data.scope === "string" ? data.scope.split(" ") : []
  if (!scopes.includes(SCOPE)) throw new Error(`Google didn't grant ${SCOPE}. Run again and allow calendar access.`)
  if (typeof data.refresh_token !== "string" || !data.refresh_token) {
    throw new Error("Google didn't return a refresh token. Remove the app's access at myaccount.google.com/permissions and run again.")
  }
  return data.refresh_token
}

function shellArg(value: string): string {
  return /^[A-Za-z0-9._/-]+$/.test(value) ? value : `'${value.replace(/'/g, `'\\''`)}'`
}

async function main(): Promise<void> {
  const clientId = await readSetting("GOOGLE_CALENDAR_CLIENT_ID", "OAuth client ID")
  const clientSecret = await readSetting("GOOGLE_CALENDAR_CLIENT_SECRET", "OAuth client secret")

  const verifier = base64Url(randomBytes(32))
  const challenge = base64Url(createHash("sha256").update(verifier).digest())
  const state = base64Url(randomBytes(16))

  const server = createServer()
  try {
    const port = await listen(server)
    const redirectUri = `http://127.0.0.1:${port}`
    const codeReceived = waitForCode(server, state)
    const authUrl = `${AUTH_URL}?${new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPE,
      access_type: "offline",
      prompt: "consent",
      hd: HOSTED_DOMAIN,
      state,
      code_challenge: challenge,
      code_challenge_method: "S256",
    }).toString()}`

    console.log(`\nSign in as the Clubhouse account (@${HOSTED_DOMAIN}) and allow calendar access:\n\n${authUrl}\n`)
    console.log("Opening it in your browser. Waiting up to 5 minutes…")
    openInBrowser(authUrl)

    const code = await codeReceived
    const refreshToken = await exchangeCode({ clientId, clientSecret, code, verifier, redirectUri })
    const arg = shellArg(refreshToken)

    console.log(`\nRefresh token:\n\n${refreshToken}\n`)
    console.log("Store it on each deployment (from the main checkout):\n")
    console.log(`  npx convex env set GOOGLE_CALENDAR_REFRESH_TOKEN ${arg}`)
    console.log(`  npx convex env set GOOGLE_CALENDAR_REFRESH_TOKEN ${arg} --prod\n`)
    console.log("The first sets the dev deployment; add --prod (second line) for production.")
    console.log("Treat the token like a password: don't save it in a file or paste it in chat.")
  } finally {
    server.closeAllConnections()
    server.close()
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(`\nGoogle Calendar sign-in stopped: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  })
}
