import { describe, expect, it } from "vitest"
import { createInitialPreviewPreferences } from "../preferences/previewPreferencesReducer"
import { getPreviewReturnState, savePreviewReturnState } from "./previewReturnState"

const location = { pathname: "/preview/event-1", search: "?type=timeline&returnTo=%2Fcontacts%2Fcontact-1", hash: "" }

describe("preview return state", () => {
  it("keeps preview options and scroll position while preserving the original destination", () => {
    const preferences = createInitialPreviewPreferences()
    preferences.timeline.includeSystemRows = false
    const path = savePreviewReturnState(location, { scrollTop: 1420, preferences })
    const params = new URL(path, "https://event-horizon.local").searchParams
    expect(params.get("type")).toBe("timeline")
    expect(params.get("returnTo")).toBe("/contacts/contact-1")
    expect(getPreviewReturnState(params)).toEqual({ scrollTop: 1420, preferences })
    expect(getPreviewReturnState(new URLSearchParams("resume=missing"))).toBeUndefined()
  })

  it("replaces old return tickets and bounds retained state", () => {
    const state = { scrollTop: 100, preferences: createInitialPreviewPreferences() }
    const firstPath = savePreviewReturnState(location, state)
    const firstParams = new URL(firstPath, "https://event-horizon.local").searchParams
    const replacement = savePreviewReturnState({ ...location, search: `?${firstParams}` }, state)
    const replacementParams = new URL(replacement, "https://event-horizon.local").searchParams
    expect(replacementParams.getAll("resume")).toHaveLength(1)
    expect(replacementParams.get("resume")).not.toBe(firstParams.get("resume"))
    for (let index = 0; index < 20; index++) savePreviewReturnState(location, state)
    expect(getPreviewReturnState(firstParams)).toBeUndefined()
  })
})
