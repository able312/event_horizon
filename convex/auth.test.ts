import { convexTest } from "convex-test"
import { ConvexError } from "convex/values"
import { describe, expect, it } from "vitest"

import { api } from "./_generated/api"
import { isCompanyEmail } from "./lib/auth"
import { companyIdentity } from "./lib/testIdentity"
import schema from "./schema"

const modules = import.meta.glob("./**/*.{ts,js}")

type RegisteredFunction = {
  isQuery?: boolean
  isMutation?: boolean
  isAction?: boolean
  isPublic?: boolean
  isInternal?: boolean
  _handler: (ctx: unknown, args: unknown) => Promise<unknown>
}

function isRegisteredFunction(value: unknown): value is RegisteredFunction {
  return typeof value === "function" && ("isQuery" in value || "isMutation" in value || "isAction" in value)
}

/** Every registered function in the deployable modules (not tests, helpers, or generated code). */
async function registeredFunctions(): Promise<[string, RegisteredFunction][]> {
  const found: [string, RegisteredFunction][] = []
  for (const [path, load] of Object.entries(modules)) {
    if (path.includes("_generated/") || path.startsWith("./lib/") || path.endsWith(".test.ts") || path.endsWith(".config.ts") || path === "./schema.ts") continue
    const exports = await load() as Record<string, unknown>
    for (const [name, value] of Object.entries(exports)) {
      if (isRegisteredFunction(value)) found.push([`${path}:${name}`, value])
    }
  }
  return found
}

/** Internal functions run only through the Convex CLI with admin access. */
const CLI_ONLY_FUNCTIONS = new Set([
  "./developmentSeed.ts:seed",
  "./legacyImport.ts:nonEmptyTables",
  "./legacyImport.ts:insertBatch",
  "./legacyImport.ts:dump",
])

function authCode(error: unknown): unknown {
  return error instanceof ConvexError ? (error.data as { code?: unknown }).code : undefined
}

// The database must never be reached before the identity check.
const untouchableDb = new Proxy({}, { get: () => { throw new Error("database accessed before auth check") } })

async function rejection(fn: RegisteredFunction, identity: object | null): Promise<unknown> {
  const ctx = { auth: { getUserIdentity: async () => identity }, db: untouchableDb }
  try {
    await fn._handler(ctx, {})
  } catch (error) {
    return authCode(error)
  }
  return "resolved"
}

describe("company email domain", () => {
  it("accepts only the exact company domain", () => {
    expect(isCompanyEmail("staff@westlinks.ca")).toBe(true)
    expect(isCompanyEmail("Staff@WestLinks.CA")).toBe(true)
    expect(isCompanyEmail("staff@weslinks.ca")).toBe(false)
    expect(isCompanyEmail("staff@mail.westlinks.ca")).toBe(false)
    expect(isCompanyEmail("staff@westlinks.ca.example.com")).toBe(false)
    expect(isCompanyEmail("westlinks.ca@gmail.com")).toBe(false)
    expect(isCompanyEmail("@westlinks.ca")).toBe(false)
    expect(isCompanyEmail("")).toBe(false)
    expect(isCompanyEmail(undefined)).toBe(false)
  })
})

describe("auth enforcement on every function", () => {
  it("finds the registered functions", async () => {
    expect((await registeredFunctions()).length).toBeGreaterThan(70)
  })

  it("exposes only public queries and mutations, except the CLI-only seed and import functions", async () => {
    for (const [name, fn] of await registeredFunctions()) {
      if (CLI_ONLY_FUNCTIONS.has(name)) {
        expect(fn.isInternal).toBe(true)
        expect(fn.isPublic).not.toBe(true)
        expect(fn.isAction).not.toBe(true)
        continue
      }
      expect({ name, isPublic: fn.isPublic === true, isAction: fn.isAction === true }).toEqual({ name, isPublic: true, isAction: false })
    }
  })

  it("rejects unauthenticated, wrong-domain, and email-less callers before reading data", async () => {
    for (const [name, fn] of await registeredFunctions()) {
      if (CLI_ONLY_FUNCTIONS.has(name)) continue
      expect({ name, code: await rejection(fn, null) }).toEqual({ name, code: "Unauthenticated" })
      expect({ name, code: await rejection(fn, { subject: "user_x", email: "someone@gmail.com" }) }).toEqual({ name, code: "Forbidden" })
      expect({ name, code: await rejection(fn, { subject: "user_x", email: "someone@mail.westlinks.ca" }) }).toEqual({ name, code: "Forbidden" })
      expect({ name, code: await rejection(fn, { subject: "user_x" }) }).toEqual({ name, code: "Forbidden" })
    }
  })

  it("rejects calls through the client API without a company identity", async () => {
    const t = convexTest(schema, modules)
    await expect(t.query(api.events.getUnscheduled, {})).rejects.toThrow(/Sign in to continue/)
    await expect(t.withIdentity({ subject: "user_x", email: "someone@gmail.com" }).mutation(api.events.importFromCalendar, { rows: [] }))
      .rejects.toThrow(/Only @westlinks\.ca accounts/)
    expect(await t.withIdentity(companyIdentity).query(api.events.getUnscheduled, {})).toEqual([])
  })
})

describe("users", () => {
  it("creates the signed-in user once and refreshes changed details", async () => {
    const t = convexTest(schema, modules)
    const asStaff = t.withIdentity({ ...companyIdentity, email: "Staff@WestLinks.ca", name: "Sam Staff" })
    expect(await asStaff.query(api.users.current, {})).toBeNull()

    const id = await asStaff.mutation(api.users.store, {})
    expect(await asStaff.mutation(api.users.store, {})).toBe(id)
    expect(await asStaff.query(api.users.current, {})).toMatchObject({ id, workosUserId: "user_test", email: "staff@westlinks.ca", name: "Sam Staff" })

    await t.withIdentity({ ...companyIdentity, givenName: "Sam", familyName: "Renamed" }).mutation(api.users.store, {})
    expect(await asStaff.query(api.users.current, {})).toMatchObject({ id, name: "Sam Renamed" })
    expect(await t.run((ctx) => ctx.db.query("users").collect())).toHaveLength(1)
  })

  it("rejects non-company accounts", async () => {
    const t = convexTest(schema, modules)
    await expect(t.withIdentity({ subject: "user_x", email: "someone@gmail.com" }).mutation(api.users.store, {})).rejects.toThrow(/Only @westlinks\.ca/)
    expect(await t.run((ctx) => ctx.db.query("users").collect())).toEqual([])
  })
})
