import { ConvexError } from "convex/values"
import type { GoogleCalendarEventBody } from "../../src/lib/googleCalendar"

// Writes events to the venue's shared Google Calendar as the Clubhouse account. That
// account signed in once (scripts/google-calendar-auth.ts); its refresh token and the
// OAuth client are deployment env vars, so nothing ships with the app.
// Setup: docs/GOOGLE_CALENDAR_SETUP.md.

// Convex exposes deployment env vars on process.env; Node types aren't loaded for Convex code.
declare const process: { env: Record<string, string | undefined> }

const TOKEN_URL = "https://oauth2.googleapis.com/token"
const CALENDAR_API_URL = "https://www.googleapis.com/calendar/v3"

export type GoogleCalendarErrorCode =
  | "GoogleCalendarNotConfigured"
  | "GoogleCalendarAuth"
  | "GoogleCalendarEventNotFound"
  | "GoogleCalendarUnrecognizedLink"
  | "GoogleCalendarFailed"

/** A refusal whose message is written for the person who clicked the button. */
export function googleCalendarError(code: GoogleCalendarErrorCode, message: string) {
  return new ConvexError({ code, message })
}

export type GoogleCalendarConfig = {
  clientId: string
  clientSecret: string
  refreshToken: string
  calendarId: string
}

const CONFIG_ENV_VARS: Record<keyof GoogleCalendarConfig, string> = {
  clientId: "GOOGLE_CALENDAR_CLIENT_ID",
  clientSecret: "GOOGLE_CALENDAR_CLIENT_SECRET",
  refreshToken: "GOOGLE_CALENDAR_REFRESH_TOKEN",
  calendarId: "GOOGLE_CALENDAR_ID",
}

/** False on deployments where Google Calendar hasn't been set up (e.g. local and worktree databases). */
export function isGoogleCalendarConfigured(): boolean {
  return Object.values(CONFIG_ENV_VARS).every(name => Boolean(process.env[name]?.trim()))
}

export function readGoogleCalendarConfig(): GoogleCalendarConfig {
  const config: GoogleCalendarConfig = {
    clientId: process.env[CONFIG_ENV_VARS.clientId]?.trim() ?? "",
    clientSecret: process.env[CONFIG_ENV_VARS.clientSecret]?.trim() ?? "",
    refreshToken: process.env[CONFIG_ENV_VARS.refreshToken]?.trim() ?? "",
    calendarId: process.env[CONFIG_ENV_VARS.calendarId]?.trim() ?? "",
  }
  const missing = (Object.keys(CONFIG_ENV_VARS) as Array<keyof GoogleCalendarConfig>)
    .filter(key => !config[key])
    .map(key => CONFIG_ENV_VARS[key])
  if (missing.length > 0) {
    console.error(`Google Calendar env vars missing: ${missing.join(", ")}`)
    throw googleCalendarError("GoogleCalendarNotConfigured", "Google Calendar isn't set up on this deployment yet. Ask an admin to finish the setup.")
  }
  return config
}

/**
 * The Google event ID a new event is created with. Google allows base32hex IDs
 * (a–v, 0–9), so hex-encoding the Convex ID gives each event one fixed Google ID:
 * a repeated or simultaneous first push finds the existing copy instead of adding a second.
 */
export function googleEventIdFor(eventId: string): string {
  const hex = Array.from(new TextEncoder().encode(eventId), byte => byte.toString(16).padStart(2, "0")).join("")
  return `eh${hex}`
}

export type GoogleCalendarLink = { eventId: string } | { iCalUID: string }

// Google's own events have an iCalUID of "<event ID>@google.com".
const GOOGLE_ICAL_SUFFIX = "@google.com"
const RAW_EVENT_ID = /^[A-Za-z0-9_]{5,1024}$/

/** Reads the `eid` Google puts in event links: base64 of "<event ID> <calendar>". */
function decodeEid(value: string): string | null {
  if (!/^[A-Za-z0-9+/_-]+={0,2}$/.test(value)) return null
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "")
  let text: string
  try {
    text = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="))
  } catch {
    return null
  }
  const parts = text.split(" ")
  if (parts.length !== 2 || !parts.every(part => /^[\x21-\x7e]+$/.test(part))) return null
  return RAW_EVENT_ID.test(parts[0]!) ? parts[0]! : null
}

function eidFromUrl(value: string): string | null {
  if (!/^https?:\/\//i.test(value)) return null
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  const eid = url.searchParams.get("eid")
  if (eid) return eid
  const segments = url.pathname.split("/").filter(Boolean)
  const editIndex = segments.indexOf("eventedit")
  return editIndex >= 0 ? segments[editIndex + 1] ?? null : null
}

/**
 * An event's `calendarId` may hold an iCalUID (set by this sync or the ICS import),
 * or whatever was pasted by hand before it: an event ID, an `eid`, or a whole event link.
 */
export function parseGoogleCalendarLink(stored: string): GoogleCalendarLink {
  const value = stored.trim()
  const candidate = eidFromUrl(value) ?? value
  if (candidate.includes("@")) {
    return candidate.endsWith(GOOGLE_ICAL_SUFFIX)
      ? { eventId: candidate.slice(0, -GOOGLE_ICAL_SUFFIX.length) }
      : { iCalUID: candidate }
  }
  const fromEid = decodeEid(candidate)
  if (fromEid) return { eventId: fromEid }
  if (RAW_EVENT_ID.test(candidate)) return { eventId: candidate }
  throw googleCalendarError("GoogleCalendarUnrecognizedLink", "The linked Google Calendar ID isn't one Event Horizon recognises. Edit it, or remove it from Google Calendar, then try again.")
}

type JsonObject = Record<string, unknown>

async function readJson(response: Response): Promise<JsonObject> {
  try {
    const data: unknown = await response.json()
    return typeof data === "object" && data !== null && !Array.isArray(data) ? (data as JsonObject) : {}
  } catch {
    return {}
  }
}

function googleErrorMessage(data: JsonObject): string {
  const error = data.error
  if (typeof error === "string") return error
  if (typeof error === "object" && error !== null && typeof (error as JsonObject).message === "string") return (error as JsonObject).message as string
  return "no error message"
}

const AUTH_EXPIRED_MESSAGE = "Event Horizon's access to Google Calendar has expired or was removed. Ask an admin to sign it in again."

function requestFailed(action: string, status: number, data: JsonObject): ConvexError<{ code: GoogleCalendarErrorCode; message: string }> {
  console.error(`Google Calendar ${action} failed (${status}): ${googleErrorMessage(data)}`)
  if (status === 401) return googleCalendarError("GoogleCalendarAuth", AUTH_EXPIRED_MESSAGE)
  if (status === 403) {
    return googleCalendarError("GoogleCalendarAuth", "Google Calendar refused the change. Check that the Clubhouse account can make changes to events on the shared calendar.")
  }
  return googleCalendarError("GoogleCalendarFailed", "Google Calendar didn't accept the change. Try again in a minute.")
}

export async function getAccessToken(config: GoogleCalendarConfig): Promise<string> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  })
  const data = await readJson(response)
  if (response.ok && typeof data.access_token === "string") return data.access_token
  if (data.error === "invalid_grant" || data.error === "invalid_client" || data.error === "unauthorized_client") {
    console.error(`Google Calendar sign-in refresh failed: ${String(data.error)}`)
    throw googleCalendarError("GoogleCalendarAuth", AUTH_EXPIRED_MESSAGE)
  }
  throw requestFailed("sign-in refresh", response.status, data)
}

export type SavedGoogleEvent = {
  /** Stored as the event's `calendarId`, which is also what the ICS import matches on. */
  iCalUID: string
  /** On calendar.google.com, the only Google Calendar origin the desktop app opens. */
  eventUrl: string
}

/** Google's htmlLink is on www.google.com; the same `eid` opens the event on calendar.google.com. */
function toCalendarEventUrl(htmlLink: string): string {
  const eid = new URL(htmlLink).searchParams.get("eid")
  return eid ? `https://calendar.google.com/calendar/event?eid=${encodeURIComponent(eid)}` : htmlLink
}

const EVENT_NOT_FOUND_MESSAGE =
  "The linked Google Calendar event isn't on the shared calendar. It may have been deleted for good or be on another calendar. Remove it from Google Calendar, then add the event again."

function calendarClient(config: GoogleCalendarConfig, accessToken: string) {
  const eventsUrl = `${CALENDAR_API_URL}/calendars/${encodeURIComponent(config.calendarId)}/events`
  const send = async (method: string, url: string, body?: JsonObject) => {
    const response = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${accessToken}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    return { status: response.status, ok: response.ok, data: await readJson(response) }
  }
  const toSaved = (data: JsonObject): SavedGoogleEvent => {
    if (typeof data.iCalUID !== "string" || typeof data.htmlLink !== "string") {
      throw requestFailed("response", 502, { error: "missing iCalUID or htmlLink" })
    }
    return { iCalUID: data.iCalUID, eventUrl: toCalendarEventUrl(data.htmlLink) }
  }

  const client = {
    async findEventId(iCalUID: string): Promise<string> {
      // showDeleted so a deleted copy is restored rather than reported missing
      const query = new URLSearchParams({ iCalUID, showDeleted: "true", maxResults: "1" })
      const result = await send("GET", `${eventsUrl}?${query.toString()}`)
      if (!result.ok) throw requestFailed("lookup", result.status, result.data)
      const items = Array.isArray(result.data.items) ? (result.data.items as JsonObject[]) : []
      const id = items[0]?.id
      if (typeof id !== "string") throw googleCalendarError("GoogleCalendarEventNotFound", EVENT_NOT_FOUND_MESSAGE)
      return id
    },
    /** The Google event ID for a stored link, looking up iCalUIDs. */
    async resolve(link: GoogleCalendarLink): Promise<string> {
      return "eventId" in link ? link.eventId : client.findEventId(link.iCalUID)
    },
    /** Reads the event; a deleted ("cancelled") event counts as missing. */
    async get(id: string): Promise<SavedGoogleEvent> {
      const result = await send("GET", `${eventsUrl}/${encodeURIComponent(id)}`)
      if (result.status === 404 || result.status === 410 || (result.ok && result.data.status === "cancelled")) {
        throw googleCalendarError("GoogleCalendarEventNotFound", EVENT_NOT_FOUND_MESSAGE)
      }
      if (!result.ok) throw requestFailed("lookup", result.status, result.data)
      return toSaved(result.data)
    },
    /** Insert with a chosen ID; null when that ID is already taken (even by a deleted event). */
    async insert(id: string, body: GoogleCalendarEventBody): Promise<SavedGoogleEvent | null> {
      const result = await send("POST", eventsUrl, { ...body, id })
      if (result.status === 409) return null
      if (!result.ok) throw requestFailed("create", result.status, result.data)
      return toSaved(result.data)
    },
    /** Overwrites the fields Event Horizon owns; status "confirmed" restores a deleted event. */
    async patch(id: string, body: GoogleCalendarEventBody): Promise<SavedGoogleEvent> {
      const result = await send("PATCH", `${eventsUrl}/${encodeURIComponent(id)}`, { ...body, status: "confirmed" })
      if (result.status === 404 || result.status === 410) throw googleCalendarError("GoogleCalendarEventNotFound", EVENT_NOT_FOUND_MESSAGE)
      if (!result.ok) throw requestFailed("update", result.status, result.data)
      return toSaved(result.data)
    },
    /** False when the event was already gone (404) or already deleted (410). */
    async remove(id: string): Promise<boolean> {
      const result = await send("DELETE", `${eventsUrl}/${encodeURIComponent(id)}`)
      if (result.status === 404 || result.status === 410) return false
      if (!result.ok) throw requestFailed("delete", result.status, result.data)
      return true
    },
  }
  return client
}

/** Updates the linked Google event, or creates one with `newEventId` when nothing is linked yet. */
export async function saveGoogleCalendarEvent(
  config: GoogleCalendarConfig,
  request: { linkedCalendarId: string | null; newEventId: string; body: GoogleCalendarEventBody },
): Promise<SavedGoogleEvent> {
  const client = calendarClient(config, await getAccessToken(config))
  const linked = request.linkedCalendarId?.trim()
  if (linked) {
    return client.patch(await client.resolve(parseGoogleCalendarLink(linked)), request.body)
  }
  return (await client.insert(request.newEventId, request.body)) ?? client.patch(request.newEventId, request.body)
}

/** The calendar.google.com link of the linked Google event, for opening it from the app. */
export async function findGoogleCalendarEventUrl(config: GoogleCalendarConfig, linkedCalendarId: string): Promise<string> {
  const link = parseGoogleCalendarLink(linkedCalendarId)
  const client = calendarClient(config, await getAccessToken(config))
  return (await client.get(await client.resolve(link))).eventUrl
}

/**
 * Deletes the linked Google event from the shared calendar. Returns false when there was
 * nothing to delete: the event is already gone, or the stored link isn't one we can read.
 */
export async function deleteGoogleCalendarEvent(config: GoogleCalendarConfig, linkedCalendarId: string): Promise<boolean> {
  let link: GoogleCalendarLink
  try {
    link = parseGoogleCalendarLink(linkedCalendarId)
  } catch {
    return false
  }
  const client = calendarClient(config, await getAccessToken(config))
  let eventId: string
  if ("eventId" in link) {
    eventId = link.eventId
  } else {
    try {
      eventId = await client.findEventId(link.iCalUID)
    } catch (error) {
      if (error instanceof ConvexError && (error.data as { code?: unknown }).code === "GoogleCalendarEventNotFound") return false
      throw error
    }
  }
  return client.remove(eventId)
}
