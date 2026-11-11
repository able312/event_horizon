import { describe, expect, it } from "vitest"
import { detectNewIds } from "./newIdDetection"

describe("detectNewIds", () => {
  it("silently baselines startup requests, including an empty Inbox", () => {
    expect(detectNewIds(null, ["a", "b"]).newIds).toEqual([])
    const empty = detectNewIds(null, [])
    expect(detectNewIds(empty.seen, ["a"]).newIds).toEqual(["a"])
  })
  it("detects IDs rather than count changes, without mutating its input", () => {
    const seen = new Set(["a", "b"])
    const result = detectNewIds(seen, ["c", "b", "c", "d"])
    expect(result.newIds).toEqual(["c", "d"])
    expect([...seen]).toEqual(["a", "b"])
    expect(detectNewIds(result.seen, ["d", "b", "c"]).newIds).toEqual([])
  })
  it("does not re-alert after dismiss/undo, rollback or refetch", () => {
    const baseline = detectNewIds(null, ["a"])
    const dismissed = detectNewIds(baseline.seen, [])
    expect(detectNewIds(dismissed.seen, ["a"]).newIds).toEqual([])
  })
})
