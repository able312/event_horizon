import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { logAndThrow, toError } from "./ipcErrors.js"

describe("toError", () => {
  it("returns the same Error instance when given an Error", () => {
    const original = new Error("original error")
    const normalized = toError(original, "fallback message")

    expect(normalized).toBe(original)
  })

  it.each([
    ["string", "bad value"],
    ["object", { reason: "bad value" }],
    ["null", null],
    ["undefined", undefined],
  ])("wraps %s non-error input with fallback message", (_label, input) => {
    const fallback = "fallback message"
    const normalized = toError(input, fallback)

    expect(normalized).toBeInstanceOf(Error)
    expect(normalized.message).toBe(fallback)
  })
})

describe("logAndThrow", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it("throws the same Error instance and logs context", () => {
    const context = "Error creating event:"
    const original = new Error("db exploded")

    expect(() => logAndThrow(context, original)).toThrow(original)
    expect(consoleErrorSpy).toHaveBeenCalledWith(context, original)
  })

  it("always throws an Error for non-error input and logs context", () => {
    const context = "Error updating event:"
    const nonErrorInput = "not an error object"
    let thrown: unknown

    try {
      logAndThrow(context, nonErrorInput)
    } catch (err) {
      thrown = err
    }

    expect(thrown).toBeInstanceOf(Error)
    if (thrown instanceof Error) {
      expect(thrown.message).toBe(context)
    }
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
    expect(consoleErrorSpy).toHaveBeenCalledWith(context, thrown)
  })
})
