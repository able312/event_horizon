import type { EventType } from "../../src/definitions/database"
import { cleanText, isValidEmail } from "../../src/lib/contacts/contactRules"

// The website's Google Form posts each response here through Apps Script. Answers
// arrive keyed by question title, so the titles below are the contract with the
// form: renaming one in Forms makes its required answer "missing" and the response
// is rejected (Apps Script marks the Sheet row Failed) instead of losing the field.
// Questions not listed here are kept as extra answers, so adding one is safe.

export const QUESTIONS = {
  firstName: "First name",
  lastName: "Last name",
  organizationName: "Organization (if any)",
  phone: "Phone",
  eventType: "Event type",
  preferredDate: "Preferred date",
  alternateDate: "Alternate date",
  startTime: "Approximate start time",
  guestCount: "Estimated guests",
  details: "Tell us about your event",
  referralSource: "How did you hear about us?",
} as const

/** Form choice → app event type. */
export const EVENT_TYPE_CHOICES: Readonly<Record<string, EventType>> = {
  "Golf Tournament": "tournament",
  Wedding: "wedding",
  "Other Event": "function",
}

/** Larger request bodies are refused before parsing. */
export const MAX_BODY_BYTES = 32_000
const MAX_GUESTS = 10_000
const MAX_EXTRA_ANSWERS = 20
const LIMITS = { name: 100, organization: 200, phone: 40, email: 254, short: 200, long: 5_000, question: 300, answer: 2_000, responseId: 200 }

export type ExtraAnswer = { question: string; answer: string }

/** A validated form response, ready to store as a pending request. */
export type EventRequestSubmission = {
  responseId: string
  /** ISO datetime the client submitted the form */
  submittedAt: string
  firstName: string
  lastName: string
  organizationName: string | null
  email: string
  phone: string
  eventType: EventType
  /** yyyy-MM-dd */
  preferredDate: string | null
  /** yyyy-MM-dd */
  alternateDate: string | null
  /** HH:mm (24-hour) */
  startTime: string | null
  guestCount: number
  details: string | null
  referralSource: string | null
  extraAnswers: ExtraAnswer[]
}

export type ParseResult =
  | { ok: true; submission: EventRequestSubmission }
  | { ok: false; problems: string[] }

const KNOWN_QUESTIONS = new Set<string>(Object.values(QUESTIONS))

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** Forms sends checkbox answers as arrays; everything else is a string. */
function answerText(value: unknown): string | null {
  if (typeof value === "string") return cleanText(value)
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) return cleanText(value.join(", "))
  return null
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function isClockTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

/**
 * Checks an Apps Script payload `{ responseId, submittedAt, respondentEmail, answers }`
 * and returns every problem at once, so one failed sync shows the whole fix.
 */
export function parseEventRequestPayload(payload: unknown): ParseResult {
  if (!isRecord(payload)) return { ok: false, problems: ["Body must be a JSON object"] }
  const problems: string[] = []
  const answers = isRecord(payload.answers) ? payload.answers : {}
  if (!isRecord(payload.answers)) problems.push("answers must be an object keyed by question title")

  function text(value: unknown, label: string, max: number, required: true): string
  function text(value: unknown, label: string, max: number, required: false): string | null
  function text(value: unknown, label: string, max: number, required: boolean): string | null {
    const cleaned = answerText(value)
    if (value !== undefined && value !== null && cleaned === null && typeof value !== "string") problems.push(`${label} must be text`)
    if (cleaned === null) {
      if (required) problems.push(`${label} is required`)
      return required ? "" : null
    }
    if (cleaned.length > max) problems.push(`${label} must be ${max} characters or fewer`)
    return cleaned
  }
  const answer = (title: string, max: number) => text(answers[title], `"${title}"`, max, false)
  const requiredAnswer = (title: string, max: number) => text(answers[title], `"${title}"`, max, true)

  const responseId = text(payload.responseId, "responseId", LIMITS.responseId, true)
  const submittedAt = text(payload.submittedAt, "submittedAt", LIMITS.short, true)
  if (submittedAt && Number.isNaN(Date.parse(submittedAt))) problems.push("submittedAt must be an ISO datetime")

  const email = text(payload.respondentEmail, "respondentEmail", LIMITS.email, true)
  if (email && !isValidEmail(email)) problems.push("respondentEmail is not a valid email address")

  const eventTypeChoice = requiredAnswer(QUESTIONS.eventType, LIMITS.short)
  const eventType = EVENT_TYPE_CHOICES[eventTypeChoice]
  if (eventTypeChoice && !eventType) {
    problems.push(`"${QUESTIONS.eventType}" must be one of: ${Object.keys(EVENT_TYPE_CHOICES).join(", ")}`)
  }

  const date = (title: string) => {
    const value = answer(title, LIMITS.short)
    if (value && !isCalendarDate(value)) problems.push(`"${title}" must be a date (yyyy-MM-dd)`)
    return value
  }
  const preferredDate = date(QUESTIONS.preferredDate)
  const alternateDate = date(QUESTIONS.alternateDate)

  const startTime = answer(QUESTIONS.startTime, LIMITS.short)
  if (startTime && !isClockTime(startTime)) problems.push(`"${QUESTIONS.startTime}" must be a time (HH:mm)`)

  const guestText = requiredAnswer(QUESTIONS.guestCount, LIMITS.short)
  const guestCount = Number(guestText)
  if (guestText && (!/^\d+$/.test(guestText) || guestCount < 1 || guestCount > MAX_GUESTS)) {
    problems.push(`"${QUESTIONS.guestCount}" must be a whole number from 1 to ${MAX_GUESTS}`)
  }

  const extraAnswers: ExtraAnswer[] = []
  for (const [question, value] of Object.entries(answers)) {
    if (KNOWN_QUESTIONS.has(question)) continue
    const cleaned = answerText(value)
    if (cleaned === null) continue
    if (question.length > LIMITS.question || cleaned.length > LIMITS.answer) {
      problems.push(`Extra answer "${question.slice(0, 50)}" is too long`)
      continue
    }
    extraAnswers.push({ question, answer: cleaned })
  }
  if (extraAnswers.length > MAX_EXTRA_ANSWERS) problems.push(`At most ${MAX_EXTRA_ANSWERS} extra answers are accepted`)

  const submission: EventRequestSubmission = {
    responseId,
    submittedAt: submittedAt && !Number.isNaN(Date.parse(submittedAt)) ? new Date(submittedAt).toISOString() : "",
    firstName: requiredAnswer(QUESTIONS.firstName, LIMITS.name),
    lastName: requiredAnswer(QUESTIONS.lastName, LIMITS.name),
    organizationName: answer(QUESTIONS.organizationName, LIMITS.organization),
    email,
    phone: requiredAnswer(QUESTIONS.phone, LIMITS.phone),
    eventType: eventType ?? "function",
    preferredDate,
    alternateDate,
    startTime,
    guestCount,
    details: answer(QUESTIONS.details, LIMITS.long),
    referralSource: answer(QUESTIONS.referralSource, LIMITS.short),
    extraAnswers,
  }
  return problems.length > 0 ? { ok: false, problems } : { ok: true, submission }
}

/** Compares secrets without stopping at the first differing character. */
export function secretsMatch(provided: string, expected: string): boolean {
  if (expected.length === 0) return false
  let diff = provided.length ^ expected.length
  for (let i = 0; i < expected.length; i++) {
    diff |= (provided.charCodeAt(i) || 0) ^ expected.charCodeAt(i)
  }
  return diff === 0
}
