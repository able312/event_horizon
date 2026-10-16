import { httpRouter } from "convex/server"
import { internal } from "./_generated/api"
import { httpAction } from "./_generated/server"
import { MAX_BODY_BYTES, parseEventRequestPayload, secretsMatch } from "./lib/eventRequestPayload"

// The only route that runs without a signed-in company account. Apps Script on
// the website form's response Sheet calls it with a shared secret
// (EVENT_REQUEST_SECRET, set per deployment). It can only add a pending request.

// Convex exposes deployment env vars on process.env; Node types aren't loaded for Convex code.
declare const process: { env: Record<string, string | undefined> }

const http = httpRouter()

function json(status: number, body: object) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })
}

const receiveEventRequest = httpAction(async (ctx, request) => {
  const secret = process.env.EVENT_REQUEST_SECRET ?? ""
  if (!secret) return json(503, { error: "Event requests are not configured on this deployment" })
  const provided = request.headers.get("Authorization")?.replace(/^Bearer /, "") ?? ""
  if (!secretsMatch(provided, secret)) return json(401, { error: "Unauthorized" })

  const declaredLength = Number(request.headers.get("Content-Length") ?? 0)
  if (declaredLength > MAX_BODY_BYTES) return json(413, { error: "Request body is too large" })
  const body = await request.text()
  if (new TextEncoder().encode(body).length > MAX_BODY_BYTES) return json(413, { error: "Request body is too large" })

  let payload: unknown
  try { payload = JSON.parse(body) } catch { return json(400, { error: "Body must be valid JSON" }) }

  const parsed = parseEventRequestPayload(payload)
  if (!parsed.ok) return json(422, { error: "Invalid event request", problems: parsed.problems })

  const { id, duplicate } = await ctx.runMutation(internal.eventRequests.receive, parsed.submission)
  return json(200, { status: duplicate ? "duplicate" : "created", id })
})

http.route({ path: "/event-requests", method: "POST", handler: receiveEventRequest })

export default http
