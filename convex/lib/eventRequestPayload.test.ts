import { describe, expect, it } from "vitest"
import { parseEventRequestPayload, QUESTIONS, secretsMatch } from "./eventRequestPayload"

const answers = {
  [QUESTIONS.firstName]: " Ada ",
  [QUESTIONS.lastName]: "Lovelace",
  [QUESTIONS.phone]: "519-555-0100",
  [QUESTIONS.eventType]: "Wedding",
  [QUESTIONS.preferredDate]: "2027-06-12",
  [QUESTIONS.startTime]: "16:30",
  [QUESTIONS.guestCount]: "120",
  [QUESTIONS.details]: "Ceremony on the patio",
}
const payload = (overrides: Record<string, unknown> = {}, answerOverrides: Record<string, unknown> = {}) => ({
  responseId: "resp-1", submittedAt: "2026-10-16T14:00:00.000Z", respondentEmail: "ada@example.com",
  answers: { ...answers, ...answerOverrides }, ...overrides,
})
const problems = (result: ReturnType<typeof parseEventRequestPayload>) => result.ok ? [] : result.problems

describe("parseEventRequestPayload", () => {
  it("maps form answers to a cleaned submission", () => {
    const result = parseEventRequestPayload(payload({}, { [QUESTIONS.organizationName]: "  ", "Dietary needs?": ["Vegan", "Gluten free"] }))
    expect(result).toEqual({ ok: true, submission: {
      responseId: "resp-1", submittedAt: "2026-10-16T14:00:00.000Z", firstName: "Ada", lastName: "Lovelace",
      organizationName: null, email: "ada@example.com", phone: "519-555-0100", eventType: "wedding",
      preferredDate: "2027-06-12", alternateDate: null, startTime: "16:30", guestCount: 120,
      details: "Ceremony on the patio", referralSource: null,
      extraAnswers: [{ question: "Dietary needs?", answer: "Vegan, Gluten free" }],
    } })
  })

  it("maps each event type choice", () => {
    const type = (choice: string) => { const r = parseEventRequestPayload(payload({}, { [QUESTIONS.eventType]: choice })); return r.ok ? r.submission.eventType : null }
    expect([type("Golf Tournament"), type("Wedding"), type("Other Event")]).toEqual(["tournament", "wedding", "function"])
    expect(type("Birthday")).toBeNull()
  })

  it("reports every missing required answer, so a renamed question is caught", () => {
    const result = parseEventRequestPayload(payload({ respondentEmail: undefined }, { [QUESTIONS.firstName]: undefined, [QUESTIONS.guestCount]: "", "First Name": "Ada" }))
    expect(problems(result)).toEqual([
      "respondentEmail is required",
      `"${QUESTIONS.guestCount}" is required`,
      `"${QUESTIONS.firstName}" is required`,
    ])
  })

  it("rejects malformed values", () => {
    const result = parseEventRequestPayload(payload({ submittedAt: "yesterday", respondentEmail: "not-an-email" }, {
      [QUESTIONS.eventType]: "Party", [QUESTIONS.preferredDate]: "2027-02-30", [QUESTIONS.alternateDate]: "June 12",
      [QUESTIONS.startTime]: "4pm", [QUESTIONS.guestCount]: "about 100", [QUESTIONS.firstName]: "x".repeat(101),
    }))
    expect(problems(result)).toHaveLength(8)
    expect(problems(parseEventRequestPayload(payload({}, { [QUESTIONS.guestCount]: "0" })))).toHaveLength(1)
    expect(problems(parseEventRequestPayload(payload({}, { [QUESTIONS.guestCount]: "10001" })))).toHaveLength(1)
  })

  it("rejects non-object bodies, non-text answers and too many or too long extras", () => {
    expect(problems(parseEventRequestPayload(null))).toEqual(["Body must be a JSON object"])
    expect(problems(parseEventRequestPayload([]))).toEqual(["Body must be a JSON object"])
    expect(problems(parseEventRequestPayload(payload({ answers: "nope" })))).toContain("answers must be an object keyed by question title")
    expect(problems(parseEventRequestPayload(payload({}, { [QUESTIONS.phone]: 5195550100 })))).toContain(`"${QUESTIONS.phone}" must be text`)
    const extras = Object.fromEntries(Array.from({ length: 21 }, (_, i) => [`Extra ${i}`, "yes"]))
    expect(problems(parseEventRequestPayload(payload({}, extras)))).toEqual(["At most 20 extra answers are accepted"])
    expect(problems(parseEventRequestPayload(payload({}, { Long: "x".repeat(2001) })))).toEqual(['Extra answer "Long" is too long'])
  })
})

describe("secretsMatch", () => {
  it("matches only the exact, non-empty secret", () => {
    expect(secretsMatch("s3cret", "s3cret")).toBe(true)
    expect(secretsMatch("s3cre", "s3cret")).toBe(false)
    expect(secretsMatch("s3cret!", "s3cret")).toBe(false)
    expect(secretsMatch("S3cret", "s3cret")).toBe(false)
    expect(secretsMatch("", "")).toBe(false)
  })
})
