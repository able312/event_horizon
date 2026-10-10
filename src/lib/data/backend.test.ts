import { describe, expect, it } from "vitest"
import { ConvexError } from "convex/values"
import { ContactsError } from "~/lib/contacts/contactsError"
import { BackendAuthError, pickFields, pickItemFields, translateBackendError } from "./backend"
import { resolveConvexUrl } from "./backendConfig"

describe("backend errors", () => {
  it("preserves contact codes and the existing contact ID", () => {
    const error = translateBackendError(new ConvexError({ code: "EmailTaken", message: "Taken", existingContactId: "contact-1" }))
    expect(error).toBeInstanceOf(ContactsError)
    expect(error).toMatchObject({ code: "EmailTaken", message: "Taken", existingContactId: "contact-1" })
  })
  it.each(["Forbidden", "Unauthenticated"])("translates %s", (code) => {
    const error = translateBackendError(new ConvexError({ code, message: "Denied" }))
    expect(error).toBeInstanceOf(BackendAuthError)
    expect(error).toMatchObject({ code, message: "Denied" })
  })
  it("preserves ordinary and malformed errors", () => {
    for (const error of [new Error("Offline"), new ConvexError("Text"), new ConvexError({ code: "InvalidInput" }), new ConvexError(["array"])]) {
      expect(translateBackendError(error)).toBe(error)
    }
    expect(translateBackendError(new ConvexError({ code: "Other", message: "Readable" }))).toEqual(new Error("Readable"))
  })
})

it("filters immutable and undefined fields while preserving explicit empty values", () => {
  expect(pickFields({ id: "immutable", absent: undefined, nullable: null, count: 0, enabled: false, title: "" }, ["absent", "nullable", "count", "enabled", "title"])).toEqual({ nullable: null, count: 0, enabled: false, title: "" })
})

it("turns a blank service style into null without adding the key when absent", () => {
  const keys = ["name", "serviceStyle"] as const
  expect(pickItemFields({ name: "A", serviceStyle: "" }, keys)).toStrictEqual({ name: "A", serviceStyle: null })
  expect(pickItemFields({ name: "A", serviceStyle: "Plated" }, keys)).toStrictEqual({ name: "A", serviceStyle: "Plated" })
  expect(pickItemFields({ name: "A", serviceStyle: null }, keys)).toStrictEqual({ name: "A", serviceStyle: null })
  expect(pickItemFields({ name: "A" } as { name: string; serviceStyle?: string }, keys)).toStrictEqual({ name: "A" })
})

it("selects only the deployment belonging to the build environment", () => {
  const urls = { VITE_CONVEX_URL: " http://localhost:3210 ", VITE_CONVEX_PRODUCTION_URL: " https://production.convex.cloud " }
  expect(resolveConvexUrl({ DEV: true, ...urls })).toBe("http://localhost:3210")
  expect(resolveConvexUrl({ DEV: false, ...urls })).toBe("https://production.convex.cloud")
  expect(resolveConvexUrl({ DEV: false, VITE_CONVEX_URL: urls.VITE_CONVEX_URL })).toBeNull()
  expect(resolveConvexUrl({ DEV: true, VITE_CONVEX_PRODUCTION_URL: urls.VITE_CONVEX_PRODUCTION_URL })).toBeNull()
  expect(resolveConvexUrl({ DEV: false, ...urls, VITE_CONVEX_PRODUCTION_URL: "  " })).toBeNull()
})
