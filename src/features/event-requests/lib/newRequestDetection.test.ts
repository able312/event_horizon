import { describe, expect, it } from "vitest"
import { detectNewRequestIds } from "./newRequestDetection"

describe("detectNewRequestIds", () => {
  it("silently baselines startup requests, including an empty Inbox", () => {
    expect(detectNewRequestIds(null, ["a", "b"]).newIds).toEqual([])
    const empty = detectNewRequestIds(null, [])
    expect(detectNewRequestIds(empty.seen, ["a"]).newIds).toEqual(["a"])
  })
  it("detects IDs rather than count changes, without mutating its input", () => {
    const seen = new Set(["a", "b"])
    const result = detectNewRequestIds(seen, ["c", "b", "c", "d"])
    expect(result.newIds).toEqual(["c", "d"])
    expect([...seen]).toEqual(["a", "b"])
    expect(detectNewRequestIds(result.seen, ["d", "b", "c"]).newIds).toEqual([])
  })
  it("does not re-alert after dismiss/undo, rollback or refetch", () => {
    const baseline = detectNewRequestIds(null, ["a"])
    const dismissed = detectNewRequestIds(baseline.seen, [])
    expect(detectNewRequestIds(dismissed.seen, ["a"]).newIds).toEqual([])
  })
})
