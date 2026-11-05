import { describe, expect, it } from "vitest"

import { combineQueryStates, type PreviewQueryState } from "./combineQueryStates"

const loaded: PreviewQueryState = { isSuccess: true, isError: false, isFetching: false }
const loading: PreviewQueryState = { isSuccess: false, isError: false, isFetching: true }
const refetching: PreviewQueryState = { isSuccess: true, isError: false, isFetching: true }
const failed: PreviewQueryState = { isSuccess: false, isError: true, isFetching: false }

describe("combineQueryStates", () => {
  it("is ready when every query has loaded and none is fetching", () => {
    expect(combineQueryStates([loaded, loaded])).toEqual({ ready: true, error: false })
  })

  it("is not ready while any query is still loading", () => {
    expect(combineQueryStates([loaded, loading])).toEqual({ ready: false, error: false })
  })

  it("is not ready while a loaded query is refetching", () => {
    expect(combineQueryStates([loaded, refetching]).ready).toBe(false)
  })

  it("reports an error when any query failed, and is not ready", () => {
    expect(combineQueryStates([loaded, failed])).toEqual({ ready: false, error: true })
  })

  it("is not ready when a query is idle (neither loaded nor fetching)", () => {
    const idle: PreviewQueryState = { isSuccess: false, isError: false, isFetching: false }
    expect(combineQueryStates([loaded, idle]).ready).toBe(false)
  })

  it("ignores queries passed as false", () => {
    expect(combineQueryStates([loaded, false])).toEqual({ ready: true, error: false })
    const sectionShown = false
    expect(combineQueryStates([sectionShown && failed, loaded])).toEqual({ ready: true, error: false })
  })

  it("is ready with no queries", () => {
    expect(combineQueryStates([])).toEqual({ ready: true, error: false })
  })
})
