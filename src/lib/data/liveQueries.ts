import type { InfiniteData, Query, QueryClient } from "@tanstack/react-query"
import type { FunctionArgs, FunctionReference, FunctionReturnType } from "convex/server"
import { getFunctionName } from "convex/server"

// Keeps cached reads live without changing their React Query keys, so the app's key
// hierarchy and optimistic updates keep working as they did over IPC.
//
// A cached read opts in through `meta` (see `liveMeta`/`livePagesMeta`). After its
// first successful fetch it is subscribed to the Convex query it came from, and stays
// subscribed until React Query garbage-collects it. Disabled reads never fetch, so they
// never subscribe with placeholder arguments.
//
// Saves don't need to refresh anything. While any mutation is in flight, new results
// wait so they can't overwrite optimistic edits. When the last one settles, every live
// read is set to Convex's current result. Convex applies a mutation's effects to its
// local results before the mutation resolves, so that copy already includes the save.
// This also corrects optimistic edits the server changed (or didn't apply), which
// would never produce a new result.

/** One Convex query call: the function and its exact arguments. */
export type LiveSource<Result = unknown> = {
  query: FunctionReference<"query">
  args: Record<string, unknown>
  /** Type-only: what the query returns. */
  readonly __result?: Result
}

export function liveSource<Query extends FunctionReference<"query">>(
  query: Query,
  args: FunctionArgs<Query>,
): LiveSource<FunctionReturnType<Query>> {
  return { query, args: args as Record<string, unknown> }
}

type LiveMeta = {
  /** Replace the cached value with each new result. The fetcher must return exactly this query's result. */
  liveSource?: LiveSource
  /** Infinite reads: one source per loaded page; any change refetches every page from the first. */
  livePageSource?: (pageParam: unknown) => LiveSource
}

// Live reads are never stale: the subscription delivers every change.

export function liveMeta(source: LiveSource) {
  return { meta: { liveSource: source } satisfies LiveMeta, staleTime: Infinity }
}

export function livePagesMeta<PageParam>(pageSource: (pageParam: PageParam) => LiveSource) {
  return {
    meta: { livePageSource: pageSource as (pageParam: unknown) => LiveSource } satisfies LiveMeta,
    staleTime: Infinity,
  }
}

/** The part of ConvexReactClient the bridge needs; tests pass a fake. */
export interface WatchClient {
  watchQuery(
    query: FunctionReference<"query">,
    args: Record<string, unknown>,
  ): { onUpdate(callback: () => void): () => void; localQueryResult(): unknown }
}

function sourceId(source: LiveSource): string {
  return `${getFunctionName(source.query)}|${JSON.stringify(source.args)}`
}

function readMeta(query: Query): LiveMeta {
  const meta = query.meta as LiveMeta | undefined
  return meta ?? {}
}

type Subscription = {
  unsubscribe: () => void
  /** Single-source reads: copy Convex's current result into the cache if it differs. */
  reconcile?: () => void
}

/**
 * Subscribes cached reads to Convex; returns a function that stops every subscription.
 */
export function connectLiveQueries(queryClient: QueryClient, client: WatchClient): () => void {
  // queryHash -> sourceId -> subscription
  const subscriptions = new Map<string, Map<string, Subscription>>()
  /** Whether any mutation is in flight; single-source results wait until none are. */
  let saving = queryClient.isMutating() > 0

  function readResult(watch: { localQueryResult(): unknown }): { ok: true; value: unknown } | { ok: false } {
    try {
      return { ok: true, value: watch.localQueryResult() }
    } catch {
      return { ok: false }
    }
  }

  /** Without `onUpdate`, each result replaces the cached value. */
  type Wanted = { source: LiveSource; onUpdate?: (value: unknown) => void }

  function wantedSources(query: Query): Map<string, Wanted> {
    const wanted = new Map<string, Wanted>()
    const meta = readMeta(query)

    if (meta.liveSource) {
      wanted.set(sourceId(meta.liveSource), { source: meta.liveSource })
    }

    if (meta.livePageSource) {
      const data = query.state.data as InfiniteData<unknown> | undefined
      data?.pageParams.forEach((pageParam, index) => {
        const source = meta.livePageSource!(pageParam)
        wanted.set(sourceId(source), {
          source,
          onUpdate: (value) => {
            const current = query.state.data as InfiniteData<unknown> | undefined
            // The first update repeats what was just fetched; only real changes refetch.
            if (JSON.stringify(current?.pages[index]) === JSON.stringify(value)) return
            void queryClient.invalidateQueries({ queryKey: query.queryKey, exact: true })
          },
        })
      })
    }

    return wanted
  }

  function sync(query: Query) {
    const wanted = wantedSources(query)
    const current = subscriptions.get(query.queryHash) ?? new Map<string, Subscription>()

    for (const [id, subscription] of current) {
      if (!wanted.has(id)) {
        subscription.unsubscribe()
        current.delete(id)
      }
    }

    for (const [id, want] of wanted) {
      if (current.has(id)) continue
      const watch = client.watchQuery(want.source.query, want.source.args)
      const reconcile = want.onUpdate ? undefined : replaceData(query, watch)
      const unsubscribe = watch.onUpdate(() => {
        const result = readResult(watch)
        if (!result.ok) {
          // Refetch so the failure reaches the UI through the data layer's error translation.
          void queryClient.invalidateQueries({ queryKey: query.queryKey, exact: true })
          return
        }
        if (result.value === undefined) return
        if (reconcile) {
          // Otherwise applied when the last save settles.
          if (!saving) reconcile()
          return
        }
        want.onUpdate?.(result.value)
      })
      current.set(id, { unsubscribe, reconcile })
    }

    if (current.size > 0) subscriptions.set(query.queryHash, current)
    else subscriptions.delete(query.queryHash)
  }

  /** Returns a function that sets the cached value to Convex's result unless they already match. */
  function replaceData(query: Query, watch: { localQueryResult(): unknown }): () => void {
    let server: unknown
    let cached: unknown
    return () => {
      const result = readResult(watch)
      if (!result.ok || result.value === undefined) return
      // Never create an entry that was garbage-collected or never loaded.
      if (query.state.data === undefined) return
      if (result.value === server && query.state.data === cached) return
      queryClient.setQueryData(query.queryKey, result.value)
      server = result.value
      cached = query.state.data
    }
  }

  function drop(queryHash: string) {
    for (const subscription of subscriptions.get(queryHash)?.values() ?? []) subscription.unsubscribe()
    subscriptions.delete(queryHash)
  }

  const unsubscribeCache = queryClient.getQueryCache().subscribe((event) => {
    if (event.type === "removed") {
      drop(event.query.queryHash)
      return
    }
    if (event.type === "updated" && event.action.type === "success") {
      sync(event.query)
    }
  })

  const unsubscribeMutations = queryClient.getMutationCache().subscribe(() => {
    const wasSaving = saving
    saving = queryClient.isMutating() > 0
    if (!wasSaving || saving) return
    for (const sourceSubscriptions of subscriptions.values()) {
      for (const subscription of sourceSubscriptions.values()) subscription.reconcile?.()
    }
  })

  return () => {
    unsubscribeCache()
    unsubscribeMutations()
    for (const queryHash of [...subscriptions.keys()]) drop(queryHash)
  }
}
