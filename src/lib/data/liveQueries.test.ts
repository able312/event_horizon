import { QueryClient } from "@tanstack/react-query"
import { makeFunctionReference } from "convex/server"
import { describe, expect, it, vi } from "vitest"
import { connectLiveQueries, liveMeta, livePagesMeta, liveSource, type WatchClient } from "./liveQueries"

const query = makeFunctionReference<"query">("events:getById")
function setup() {
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const watches: { emit: () => void; set: (value: unknown) => void; fail: () => void; unsubscribe: ReturnType<typeof vi.fn>; args: object }[] = []
  const client: WatchClient = {
    watchQuery: vi.fn((_query, args) => {
      let value: unknown, failure = false
      const watch = { emit: (): void => undefined, set: (next: unknown) => { value = next; failure = false }, fail: () => { failure = true }, unsubscribe: vi.fn(), args }
      watches.push(watch)
      return { onUpdate: (callback: () => void) => { watch.emit = callback; return watch.unsubscribe }, localQueryResult: () => { if (failure) throw new Error("Server failure"); return value } }
    }),
  }
  const stop = connectLiveQueries(cache, client)
  return { cache, watches, stop, client }
}

describe("live connector", () => {
  it("subscribes only after successful fetch, updates data, deduplicates, and clears subscriptions", async () => {
    const { cache, watches, stop, client } = setup()
    const options = { queryKey: ["event", "one"], queryFn: async () => ({ title: "Before" }), ...liveMeta(liveSource(query, { id: "one" })) }
    cache.getQueryCache().build(cache, options)
    expect(client.watchQuery).not.toHaveBeenCalled()
    await cache.fetchQuery(options)
    expect(watches).toHaveLength(1)
    expect(watches[0].args).toEqual({ id: "one" })
    watches[0].set({ title: "After" }); watches[0].emit()
    expect(cache.getQueryData(options.queryKey)).toEqual({ title: "After" })
    expect(watches).toHaveLength(1)
    watches[0].set(undefined); watches[0].emit()
    expect(cache.getQueryData(options.queryKey)).toEqual({ title: "After" })
    cache.clear()
    expect(watches[0].unsubscribe).toHaveBeenCalledOnce()
    stop()
    expect(watches[0].unsubscribe).toHaveBeenCalledOnce()
  })
  it("leaves failed and ordinary reads unsubscribed", async () => {
    const { cache, client, stop } = setup()
    await cache.fetchQuery({ queryKey: ["ordinary"], queryFn: async () => 1 })
    await expect(cache.fetchQuery({ queryKey: ["failed"], queryFn: async () => { throw new Error("Failure") }, ...liveMeta(liveSource(query, {})) })).rejects.toThrow("Failure")
    expect(client.watchQuery).not.toHaveBeenCalled()
    stop(); cache.clear()
  })
  it("refetches errors and only changed infinite pages, removing obsolete page subscriptions", async () => {
    const { cache, watches, stop } = setup()
    const invalidate = vi.spyOn(cache, "invalidateQueries")
    const options = { queryKey: ["contacts"], queryFn: async () => ({ pages: [["A"], ["B"]], pageParams: [null, "cursor"] }), ...livePagesMeta((cursor: string | null) => liveSource(query, { cursor })) }
    await cache.fetchQuery(options)
    expect(watches).toHaveLength(2)
    watches[0].set(["A"]); watches[0].emit()
    expect(invalidate).not.toHaveBeenCalled()
    watches[1].set(["C"]); watches[1].emit()
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["contacts"], exact: true })
    invalidate.mockClear()
    watches[0].fail(); watches[0].emit()
    expect(invalidate).toHaveBeenCalledOnce()
    cache.setQueryData(["contacts"], { pages: [["A"]], pageParams: [null] })
    expect(watches[1].unsubscribe).toHaveBeenCalledOnce()
    stop()
    expect(watches[0].unsubscribe).toHaveBeenCalledOnce()
    cache.clear()
  })
})
