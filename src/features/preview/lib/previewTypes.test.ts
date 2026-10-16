import { describe, expect, it } from "vitest"

import {
  DEFAULT_PREVIEW_TYPE,
  buildPreviewPath,
  getPreviewTypesForEvent,
  resolvePreviewType,
} from "./previewTypes"

describe("resolvePreviewType", () => {
  it("defaults to beo when type is missing", () => {
    expect(resolvePreviewType(new URLSearchParams())).toBe(DEFAULT_PREVIEW_TYPE)
  })

  it("defaults to beo when type is empty or unrecognized", () => {
    expect(resolvePreviewType(new URLSearchParams("type="))).toBe(DEFAULT_PREVIEW_TYPE)
    expect(resolvePreviewType(new URLSearchParams("type=unknown"))).toBe(DEFAULT_PREVIEW_TYPE)
  })

  it("returns the requested preview type when valid", () => {
    expect(resolvePreviewType(new URLSearchParams("type=timeline"))).toBe("timeline")
    expect(resolvePreviewType(new URLSearchParams("type=beo-food"))).toBe("beo-food")
    expect(resolvePreviewType(new URLSearchParams("type=financial-report"))).toBe("financial-report")
    expect(resolvePreviewType(new URLSearchParams("type=cart-diagram"))).toBe("cart-diagram")
  })
})

describe("getPreviewTypesForEvent", () => {
  it("offers the cart setup diagram only for tournaments", () => {
    expect(getPreviewTypesForEvent("function").map(({ id }) => id)).not.toContain(
      "cart-diagram",
    )
    expect(getPreviewTypesForEvent("tournament").map(({ id }) => id)).toContain(
      "cart-diagram",
    )
  })
})

describe("buildPreviewPath", () => {
  it("preserves the event section and its own return destination", () => {
    const returnTo = "/events/evt_1/timeblock/note-1?returnTo=%2Fcontacts%2Fcontact-1"
    const preview = new URL(buildPreviewPath("evt_1", "timeline", returnTo), "https://event-horizon.local")
    expect(preview.searchParams.get("type")).toBe("timeline")
    expect(preview.searchParams.get("returnTo")).toBe(returnTo)
  })

  it("builds a preview route with the type query param", () => {
    expect(buildPreviewPath("evt_1")).toBe("/preview/evt_1?type=beo")
    expect(buildPreviewPath("evt_1", "timeline")).toBe("/preview/evt_1?type=timeline")
    expect(buildPreviewPath("evt_1", "cart-diagram")).toBe(
      "/preview/evt_1?type=cart-diagram",
    )
  })
})
