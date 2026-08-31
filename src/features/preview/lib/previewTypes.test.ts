import { describe, expect, it } from "vitest"

import {
  DEFAULT_PREVIEW_TYPE,
  buildPreviewPath,
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
  })
})

describe("buildPreviewPath", () => {
  it("builds a preview route with the type query param", () => {
    expect(buildPreviewPath("evt_1")).toBe("/preview/evt_1?type=beo")
    expect(buildPreviewPath("evt_1", "timeline")).toBe("/preview/evt_1?type=timeline")
  })
})
