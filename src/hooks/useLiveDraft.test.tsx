import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { changedFields, hasChanges, useLiveDraft } from "./useLiveDraft"

describe("changedFields", () => {
  it("returns only fields whose values differ", () => {
    expect(changedFields({ a: "x", b: 1, c: null }, { a: "x", b: 2, c: "now set" })).toEqual({ b: 2, c: "now set" })
  })

  it("treats null and undefined as different but equal values as unchanged", () => {
    expect(changedFields({ a: null as string | null | undefined }, { a: undefined })).toEqual({ a: undefined })
    expect(changedFields({ a: 0, b: "" }, { a: 0, b: "" })).toEqual({})
  })

  it("reports whether there is anything to send", () => {
    expect(hasChanges({})).toBe(false)
    expect(hasChanges({ a: null })).toBe(true)
  })
})

describe("useLiveDraft", () => {
  const original = { title: "Original", status: "new_lead" }

  it("starts from the source and overlays the user's edits", () => {
    const { result } = renderHook(() => useLiveDraft(original))
    expect(result.current.values).toEqual(original)

    act(() => result.current.update({ title: "Typed" }))
    expect(result.current.values).toEqual({ title: "Typed", status: "new_lead" })
    expect(result.current.source).toBe(original)
  })

  it("keeps edited fields and follows the source for untouched ones", () => {
    const { result, rerender } = renderHook(({ source }) => useLiveDraft(source), { initialProps: { source: original } })
    act(() => result.current.update({ title: "Typed" }))

    const live = { title: "Someone else's title", status: "confirmed" }
    rerender({ source: live })

    expect(result.current.values).toEqual({ title: "Typed", status: "confirmed" })
    expect(changedFields(result.current.source, result.current.values)).toEqual({ title: "Typed" })
  })

  it("sends nothing when an edit matches the live value", () => {
    const { result, rerender } = renderHook(({ source }) => useLiveDraft(source), { initialProps: { source: original } })
    act(() => result.current.update({ title: "Same" }))
    rerender({ source: { ...original, title: "Same" } })

    expect(changedFields(result.current.source, result.current.values)).toEqual({})
  })
})
