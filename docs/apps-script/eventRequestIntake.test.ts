// @vitest-environment node
import { readFileSync } from "node:fs"
import path from "node:path"
import vm from "node:vm"
import { describe, expect, it } from "vitest"
import { EVENT_TYPE_CHOICES, QUESTIONS, parseEventRequestPayload } from "../../convex/lib/eventRequestPayload"

// eventRequestIntake.gs runs in Google Apps Script, not here. These tests load it into
// a sandbox with small in-memory fakes of the Apps Script services it uses.

const SCRIPT = readFileSync(path.join(__dirname, "eventRequestIntake.gs"), "utf8")
const MINUTE = 60 * 1000

type Answers = Record<string, string | string[]>
type FakeResponse = { id: string; timestamp: Date; email: string; answers: Answers }
type Mail = { to: string; subject: string; body: string; replyTo?: string }
type Post = { url: string; authorization: string; payload: Record<string, unknown> }
type HttpReply = { code: number; body?: unknown }
type FakeItem = { title: string; type: string; required?: boolean; includesYear?: boolean; choices?: string[] }

const VALID_ANSWERS: Answers = {
  "First name": "Sarah",
  "Last name": "Lee",
  Phone: "555-0100",
  "Event type": "Wedding",
  "Preferred date": "2027-06-12",
  "Estimated guests": "120",
  "Tell us about your event": "Outdoor ceremony, then dinner.",
}

const REQUIRED_TITLES: string[] = [QUESTIONS.firstName, QUESTIONS.lastName, QUESTIONS.phone, QUESTIONS.eventType, QUESTIONS.guestCount]

const QUESTION_TYPES: Record<string, string> = {
  [QUESTIONS.eventType]: "MULTIPLE_CHOICE",
  [QUESTIONS.preferredDate]: "DATE",
  [QUESTIONS.alternateDate]: "DATE",
  [QUESTIONS.startTime]: "TIME",
}

const FORM_ITEMS: FakeItem[] = [
  ...Object.values(QUESTIONS).map((title): FakeItem => ({
    title,
    type: QUESTION_TYPES[title] ?? "TEXT",
    required: REQUIRED_TITLES.includes(title),
    includesYear: true,
    choices: Object.keys(EVENT_TYPE_CHOICES),
  })),
  { title: "About you", type: "SECTION_HEADER" },
]

const GOOD_PROPS: Record<string, string> = {
  CONVEX_URL: "https://happy-otter-123.convex.site/event-requests",
  EVENT_REQUEST_SECRET: "s3cret",
  TEAM_EMAILS: "events@westlinks.test, manager@westlinks.test",
}

function isDate(value: unknown): value is Date {
  return Object.prototype.toString.call(value) === "[object Date]"
}

/** An in-memory Apps Script project bound to a response Sheet and its form. */
function createScript(options: { props?: Record<string, string>; items?: FakeItem[]; collectsEmail?: boolean } = {}) {
  let now = Date.parse("2026-10-17T12:00:00Z")
  const props = new Map(Object.entries(options.props ?? GOOD_PROPS))
  const responses: FakeResponse[] = []
  const mails: Mail[] = []
  const posts: Post[] = []
  const logs: string[] = []
  // With no fallback set, answers like the Convex route: 200, or 422 with its problems.
  const http = { replies: [] as HttpReply[], fallback: null as HttpReply | null, msPerPost: 0 }
  const lock = { available: true, waitMs: 0 }
  const failMailTo = new Set<string>()
  let syncRows: unknown[][] | null = null

  const range = (rows: unknown[][], row: number, col: number, numRows: number, numCols: number) => {
    const value = {
      getValues: () =>
        rows.slice(row - 1, row - 1 + numRows).map((r) => Array.from({ length: numCols }, (_, i) => r[col - 1 + i] ?? "")),
      setValues: (values: unknown[][]) => {
        values.forEach((v, i) => {
          rows[row - 1 + i] = [...v]
        })
        return value
      },
      setFontWeight: () => value,
    }
    return value
  }
  const makeSheet = (rows: unknown[][]) => ({
    getLastRow: () => rows.length,
    appendRow: (values: unknown[]) => {
      rows.push([...values])
    },
    setFrozenRows: () => undefined,
    getRange: (row: number, col: number, numRows: number, numCols: number) => range(rows, row, col, numRows, numCols),
  })

  const items = (options.items ?? FORM_ITEMS).map((item) => {
    const typed = {
      isRequired: () => item.required ?? false,
      includesYear: () => item.includesYear ?? true,
      getChoices: () => (item.choices ?? []).map((choice) => ({ getValue: () => choice })),
    }
    return {
      getTitle: () => item.title,
      getType: () => item.type,
      asTextItem: () => typed,
      asDateItem: () => typed,
      asTimeItem: () => typed,
      asDateTimeItem: () => typed,
      asMultipleChoiceItem: () => typed,
    }
  })

  const form = {
    getResponses: (since: Date) =>
      responses
        .filter((r) => r.timestamp.getTime() >= since.getTime())
        .map((r) => ({
          getId: () => r.id,
          getTimestamp: () => r.timestamp,
          getRespondentEmail: () => r.email,
          getItemResponses: () =>
            Object.entries(r.answers).map(([title, answer]) => ({
              getResponse: () => answer,
              getItem: () => ({ getTitle: () => title.replace(/ #\d+$/, "") }),
            })),
        })),
    getItems: () => items,
    getEmailCollectionType: () => (options.collectsEmail === false ? "DO_NOT_COLLECT" : "VERIFIED"),
  }

  const sandbox = {
    console: {
      log: (message: string) => logs.push(message),
      warn: (message: string) => logs.push(message),
      error: (message: string) => logs.push(message),
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (key: string) => props.get(key) ?? null,
        setProperty: (key: string, value: string) => props.set(key, value),
      }),
    },
    LockService: {
      getScriptLock: () => ({
        tryLock: () => {
          now += lock.waitMs
          return lock.available
        },
        releaseLock: () => undefined,
      }),
    },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({
        getFormUrl: () => "https://docs.google.com/forms/d/abc/edit",
        getUrl: () => "https://docs.google.com/spreadsheets/d/xyz/edit",
        getSheetByName: () => (syncRows ? makeSheet(syncRows) : null),
        insertSheet: () => {
          syncRows = []
          return makeSheet(syncRows)
        },
      }),
    },
    FormApp: {
      openByUrl: () => form,
      ItemType: { DATE: "DATE", MULTIPLE_CHOICE: "MULTIPLE_CHOICE" },
      EmailCollectionType: { DO_NOT_COLLECT: "DO_NOT_COLLECT" },
    },
    MailApp: {
      sendEmail: (mail: Mail) => {
        if (failMailTo.has(mail.to)) throw new Error("Service invoked too many times")
        mails.push(mail)
      },
    },
    UrlFetchApp: {
      fetch: (url: string, request: { headers: { Authorization: string }; payload: string }) => {
        now += http.msPerPost
        posts.push({ url, authorization: request.headers.Authorization, payload: JSON.parse(request.payload) })
        const parsed = parseEventRequestPayload(JSON.parse(request.payload))
        const reply = http.replies.shift() ??
          http.fallback ??
          (parsed.ok ? { code: 200, body: { status: "created" } } : { code: 422, body: { error: "Invalid event request", problems: parsed.problems } })
        return { getResponseCode: () => reply.code, getContentText: () => JSON.stringify(reply.body ?? {}) }
      },
    },
    Session: { getEffectiveUser: () => ({ getEmail: () => "owner@westlinks.test" }) },
    ScriptApp: {
      getProjectTriggers: () => [],
      newTrigger: () => {
        const builder = {
          forSpreadsheet: () => builder,
          onFormSubmit: () => builder,
          timeBased: () => builder,
          everyMinutes: () => builder,
          create: () => undefined,
        }
        return builder
      },
    },
  }
  const context = vm.createContext({ ...sandbox, __now: () => now })
  // The script's clock follows `now`, so tests can step through time.
  vm.runInContext(
    "globalThis.Date = class extends Date { constructor(...args) { super(...(args.length ? args : [__now()])) } static now() { return __now() } }",
    context,
  )
  vm.runInContext(SCRIPT, context)
  const call = (name: string, ...args: unknown[]): unknown => (context[name] as (...a: unknown[]) => unknown)(...args)

  return {
    props,
    mails,
    posts,
    logs,
    http,
    lock,
    failMailTo,
    constant: (name: string): unknown => vm.runInContext(`JSON.parse(JSON.stringify(${name}))`, context),
    advance: (ms: number) => {
      now += ms
    },
    submit: (answers: Answers = VALID_ANSWERS, email = "sarah@client.test") => {
      const id = `resp-${responses.length + 1}`
      responses.push({ id, timestamp: new Date(now), email, answers })
      now += 1000
      return id
    },
    /** Data rows of the sync tab, keyed by header. */
    rows: () => {
      const [headers, ...rows] = syncRows ?? [[]]
      return rows.map((row) => Object.fromEntries(headers.map((header, i) => [String(header), row[i]])))
    },
    setStatus: (index: number, status: string) => {
      if (syncRows) syncRows[index + 1][5] = status
    },
    setup: () => call("setup"),
    run: () => call("retryUnsynced"),
    checkSetup: () => call("checkSetup"),
    readConfig: () => call("readConfig_") as { problems: string[]; convexUrl: string; clientReplyTo: string; alertEmail: string },
  }
}

describe("eventRequestIntake.gs", () => {
  it("uses the same question titles and event types as the Convex route", () => {
    const script = createScript()
    expect(script.constant("QUESTIONS")).toEqual(QUESTIONS)
    expect(script.constant("EVENT_TYPE_CHOICES")).toEqual(Object.keys(EVENT_TYPE_CHOICES))
  })

  it("emails the team and client, posts a payload Convex accepts, and marks the row Synced", () => {
    const script = createScript()
    script.setup()
    const id = script.submit()
    script.run()

    const [team, client] = script.mails
    expect(team.to).toBe("events@westlinks.test,manager@westlinks.test")
    expect(team.replyTo).toBe("sarah@client.test")
    expect(team.body).toContain("Tell us about your event: Outdoor ceremony, then dinner.")
    expect(client.to).toBe("sarah@client.test")
    expect(client.replyTo).toBe("events@westlinks.test")
    expect(client.body).not.toContain("Outdoor ceremony")

    expect(script.posts).toHaveLength(1)
    expect(script.posts[0].url).toBe(GOOD_PROPS.CONVEX_URL)
    expect(script.posts[0].authorization).toBe("Bearer s3cret")
    expect(parseEventRequestPayload(script.posts[0].payload)).toMatchObject({ ok: true })

    const [row] = script.rows()
    expect(row["Response ID"]).toBe(id)
    expect(row.Status).toBe("Synced")
    expect(isDate(row["Team emailed"])).toBe(true)
    expect(isDate(row["Client emailed"])).toBe(true)

    script.run()
    expect(script.mails).toHaveLength(2)
    expect(script.posts).toHaveLength(1)
  })

  it("ignores responses submitted before the first setup", () => {
    const script = createScript()
    script.submit()
    script.advance(MINUTE)
    script.setup()
    script.run()
    expect(script.posts).toHaveLength(0)
    expect(script.rows()).toHaveLength(0)
  })

  it("retries a rejected post without resending emails, alerts the owner once, then syncs when fixed", () => {
    const script = createScript()
    script.setup()
    script.submit()
    script.http.fallback = { code: 401, body: { error: "Unauthorized" } }

    for (let run = 0; run < 4; run++) script.run()
    const row = script.rows()[0]
    expect(row.Status).toBe("Failed: HTTP 401 (EVENT_REQUEST_SECRET does not match the deployment): Unauthorized")
    expect(row.Attempts).toBe(4)
    const alerts = script.mails.filter((mail) => mail.to === "owner@westlinks.test")
    expect(alerts).toHaveLength(1)
    expect(alerts[0].body).toContain("failed 3 times")
    expect(script.mails).toHaveLength(3)

    script.http.fallback = null
    script.run()
    script.run()
    expect(script.rows()[0].Status).toBe("Synced")
    expect(script.posts).toHaveLength(5)
    expect(script.mails).toHaveLength(3)
  })

  it("alerts the owner at once and stops retrying when Event Horizon rejects the answers", () => {
    const script = createScript()
    script.setup()
    script.submit({ ...VALID_ANSWERS, "Estimated guests": "about 50" })
    script.run()

    const row = script.rows()[0]
    expect(row.Status).toBe('Rejected: HTTP 422: "Estimated guests" must be a whole number from 1 to 10000')
    expect(isDate(row["Team emailed"])).toBe(true)
    const alerts = script.mails.filter((mail) => mail.to === "owner@westlinks.test")
    expect(alerts).toHaveLength(1)
    expect(alerts[0].body).toContain("will not be retried")

    script.http.fallback = null
    for (let run = 0; run < 4; run++) script.run()
    expect(script.posts).toHaveLength(1)
    expect(script.mails).toHaveLength(3)

    // Clearing the Status sends it again, e.g. after fixing a renamed question.
    script.http.fallback = { code: 200, body: { status: "created" } }
    script.setStatus(0, "")
    script.run()
    expect(script.posts).toHaveLength(2)
    expect(script.rows()[0].Status).toBe("Synced")
  })

  it("retries only the email that failed", () => {
    const script = createScript()
    script.setup()
    script.submit()
    script.failMailTo.add("events@westlinks.test,manager@westlinks.test")
    script.run()

    let row = script.rows()[0]
    expect(row["Team emailed"]).toBe("Failed: Service invoked too many times")
    expect(isDate(row["Client emailed"])).toBe(true)
    expect(row.Status).toBe("Synced")
    expect(row.Attempts).toBe(1)

    script.failMailTo.clear()
    script.run()
    row = script.rows()[0]
    expect(isDate(row["Team emailed"])).toBe(true)
    expect(script.mails.filter((mail) => mail.to === "sarah@client.test")).toHaveLength(1)
    expect(script.posts).toHaveLength(1)
  })

  it("stops retrying a row whose Status is set to Skip", () => {
    const script = createScript()
    script.setup()
    script.submit()
    script.http.fallback = { code: 500 }
    script.run()
    script.setStatus(0, "Skip")
    script.run()
    expect(script.posts).toHaveLength(1)
  })

  it("does nothing while another run holds the lock", () => {
    const script = createScript()
    script.setup()
    script.submit()
    script.lock.available = false
    script.run()
    expect(script.posts).toHaveLength(0)
    expect(script.rows()).toHaveLength(0)
  })

  it("counts time spent waiting for the lock toward the run budget", () => {
    const script = createScript()
    script.setup()
    for (let i = 0; i < 6; i++) script.submit()
    script.lock.waitMs = 2 * MINUTE
    script.http.msPerPost = MINUTE

    script.run()
    // 2 minutes waiting + 1 minute per post: the 4.5-minute budget allows three.
    expect(script.posts).toHaveLength(3)

    script.lock.waitMs = 0
    script.run()
    expect(script.posts).toHaveLength(6)
    expect(script.rows().every((row) => row.Status === "Synced")).toBe(true)
  })

  it("keeps both answers when two questions share a title", () => {
    const script = createScript()
    script.setup()
    script.submit({ ...VALID_ANSWERS, Phone: "555-0100", "Phone #2": "555-0199" })
    script.run()
    const answers = script.posts[0].payload.answers as Answers
    expect(answers.Phone).toBe("555-0100")
    expect(answers["Phone (2)"]).toBe("555-0199")
  })

  it("stops sync tab text from being read as a formula", () => {
    const script = createScript()
    script.setup()
    script.submit({ ...VALID_ANSWERS, "First name": "=HYPERLINK(\"x\")" })
    script.run()
    expect(script.rows()[0].Client).toBe("'=HYPERLINK(\"x\") Lee")
  })

  describe("config", () => {
    it("accepts the documented properties", () => {
      expect(createScript().readConfig().problems).toEqual([])
    })

    it("only sends the secret to a .convex.site host", () => {
      for (const url of [
        "https://happy-otter-123.convex.cloud/event-requests",
        "https://evil.example.com/event-requests",
        "https://happy-otter-123.convex.site.evil.com/event-requests",
        "http://happy-otter-123.convex.site/event-requests",
      ]) {
        const script = createScript({ props: { ...GOOD_PROPS, CONVEX_URL: url } })
        expect(script.readConfig().convexUrl).toBe("")
        script.checkSetup()
        expect(script.posts).toHaveLength(0)
        expect(script.logs.join("\n")).toContain("CONVEX_URL must look like")
      }
    })

    it("reports malformed optional addresses and falls back to the defaults", () => {
      const script = createScript({ props: { ...GOOD_PROPS, CLIENT_REPLY_TO: "events at westlinks", ALERT_EMAIL: "owner@" } })
      const config = script.readConfig()
      expect(config.problems).toEqual([
        "CLIENT_REPLY_TO is not a valid address: events at westlinks",
        "ALERT_EMAIL is not a valid address: owner@",
      ])
      expect(config.clientReplyTo).toBe("events@westlinks.test")
      expect(config.alertEmail).toBe("")
    })
  })

  describe("checkSetup", () => {
    it("passes when the form, properties and connection are right", () => {
      const script = createScript()
      script.checkSetup()
      expect(script.posts[0].payload).toEqual({})
      expect(script.logs).toEqual(["All checks passed: properties, form questions, and the Event Horizon connection."])
    })

    it("reports form problems", () => {
      const items = FORM_ITEMS.filter((item) => item.title !== QUESTIONS.lastName).map((item) => {
        if (item.title === QUESTIONS.phone) return { ...item, required: false }
        if (item.title === QUESTIONS.preferredDate) return { ...item, includesYear: false }
        if (item.title === QUESTIONS.alternateDate) return { ...item, type: "TEXT" }
        if (item.title === QUESTIONS.startTime) return { ...item, type: "DATETIME" }
        if (item.title === QUESTIONS.eventType) return { ...item, choices: ["Wedding", "Birthday"] }
        return item
      })
      items.push({ title: QUESTIONS.guestCount, type: "TEXT", required: true }, { title: "About you", type: "SECTION_HEADER" })
      const script = createScript({ items, collectsEmail: false })
      script.http.fallback = { code: 422 }
      script.checkSetup()
      const log = script.logs.join("\n")
      expect(log).toContain(`Two questions are titled "${QUESTIONS.guestCount}"`)
      expect(log).not.toContain('Two questions are titled "About you"')
      expect(log).toContain(`Required question "${QUESTIONS.lastName}" is missing`)
      expect(log).toContain(`"${QUESTIONS.phone}" must be a required question`)
      expect(log).toContain(`"${QUESTIONS.preferredDate}" must include the year`)
      expect(log).toContain(`"${QUESTIONS.alternateDate}" must be a Date question`)
      expect(log).toContain(`"${QUESTIONS.startTime}" must be a Time question`)
      expect(log).toContain("options Event Horizon won't accept: Birthday")
      expect(log).toContain("does not collect email addresses")
    })

    it("reports a connection that doesn't answer 422", () => {
      const script = createScript()
      script.http.fallback = { code: 401 }
      script.checkSetup()
      expect(script.logs.join("\n")).toContain("Event Horizon connection: HTTP 401")
    })
  })
})
