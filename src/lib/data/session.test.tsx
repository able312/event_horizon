import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { makeFunctionReference } from "convex/server"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import * as backend from "./backend"
import { BACKEND_CONNECTION_TIMEOUT_MS, useBackendSession } from "./session"
import { connectLiveQueries, liveMeta, liveSource } from "./liveQueries"

const fake = vi.hoisted(() => ({ setAuth: vi.fn(), clearAuth: vi.fn() }))
vi.mock("./backend", async (original) => ({ ...await original<typeof backend>(), getConvexClient: () => fake, isBackendConfigured: vi.fn(() => true), runMutation: vi.fn() }))
beforeEach(() => { vi.clearAllMocks(); vi.mocked(backend.isBackendConfigured).mockReturnValue(true); vi.mocked(backend.runMutation).mockResolvedValue("user") })
afterEach(() => vi.useRealTimers())
function setup(isSignedIn = true) {
  const cache = new QueryClient()
  const getAccessToken = vi.fn(async () => "token")
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={cache}>{children}</QueryClientProvider>
  const hook = renderHook((props) => useBackendSession(props), { wrapper, initialProps: { isSignedIn, getAccessToken } })
  return { ...hook, cache, getAccessToken, authChange: (accepted: boolean) => act(async () => { await fake.setAuth.mock.lastCall![1](accepted) }) }
}
it("fails closed without deployment configuration", () => {
  vi.mocked(backend.isBackendConfigured).mockReturnValue(false)
  const hook = setup()
  expect(hook.result.current.status).toBe("not-configured")
  expect(fake.setAuth).not.toHaveBeenCalled()
})
it("connects, forwards refreshed-token requests, and stores the accepted user", async () => {
  const hook = setup()
  expect(hook.result.current.status).toBe("connecting")
  expect(await fake.setAuth.mock.lastCall![0]({ forceRefreshToken: true })).toBe("token")
  expect(hook.getAccessToken).toHaveBeenCalledWith({ forceRefresh: true })
  await hook.authChange(true)
  expect(hook.result.current.status).toBe("ready")
  expect(backend.runMutation).toHaveBeenCalledOnce()
})
it("shows rejected tokens and retries", async () => {
  const hook = setup()
  await hook.authChange(false)
  expect(hook.result.current.status).toBe("rejected")
  expect(backend.runMutation).not.toHaveBeenCalled()
  act(() => hook.result.current.retry())
  expect(hook.result.current.status).toBe("connecting")
  await hook.authChange(true)
  expect(hook.result.current.status).toBe("ready")
})
it.each([
  [new backend.BackendAuthError("Forbidden", "Wrong company"), "forbidden"],
  [new Error("Offline"), "error"],
] as const)("handles user registration failure %s", async (error, status) => {
  vi.mocked(backend.runMutation).mockRejectedValue(error)
  const hook = setup()
  await hook.authChange(true)
  expect(hook.result.current).toMatchObject({ status, message: error.message })
})
it("clears auth and cached data on sign-out and ignores late registration", async () => {
  let finish!: (value: string) => void
  vi.mocked(backend.runMutation).mockReturnValue(new Promise<string>((resolve) => { finish = resolve }))
  const hook = setup()
  hook.cache.setQueryData(["private"], "data")
  act(() => { fake.setAuth.mock.lastCall![1](true) })
  hook.rerender({ isSignedIn: false, getAccessToken: hook.getAccessToken })
  expect(fake.clearAuth).toHaveBeenCalledTimes(2)
  expect(hook.cache.getQueryData(["private"])).toBeUndefined()
  await act(async () => finish("user"))
  await waitFor(() => expect(hook.result.current.status).toBe("signed-out"))
})

it.each(["sign-out", "retry", "unmount"] as const)("stops private live watches before clearing auth on %s", async (action) => {
  const hook = setup()
  await hook.authChange(true)
  const unsubscribe = vi.fn()
  const stop = connectLiveQueries(hook.cache, {
    watchQuery: () => ({ onUpdate: () => unsubscribe, localQueryResult: () => "private data" }),
  })
  await hook.cache.fetchQuery({
    queryKey: ["private"],
    queryFn: async () => "private data",
    ...liveMeta(liveSource(makeFunctionReference<"query">("events:getAll"), {})),
  })
  expect(unsubscribe).not.toHaveBeenCalled()
  fake.clearAuth.mockImplementationOnce(() => {
    expect(unsubscribe).toHaveBeenCalledOnce()
    expect(hook.cache.getQueryData(["private"])).toBeUndefined()
  })
  if (action === "sign-out") hook.rerender({ isSignedIn: false, getAccessToken: hook.getAccessToken })
  else if (action === "retry") act(() => hook.result.current.retry())
  else hook.unmount()
  expect(fake.clearAuth).toHaveBeenCalled()
  expect(unsubscribe).toHaveBeenCalledOnce()
  stop()
})

it("times out an unreachable server and can retry successfully", async () => {
  vi.useFakeTimers()
  const hook = setup()
  const oldCallback = fake.setAuth.mock.lastCall![1]
  act(() => vi.advanceTimersByTime(BACKEND_CONNECTION_TIMEOUT_MS))
  expect(hook.result.current).toMatchObject({ status: "error", message: expect.stringContaining("not responding") })
  act(() => hook.result.current.retry())
  await act(async () => oldCallback(true))
  expect(backend.runMutation).not.toHaveBeenCalled()
  expect(hook.result.current.status).toBe("connecting")
  await hook.authChange(true)
  act(() => vi.advanceTimersByTime(BACKEND_CONNECTION_TIMEOUT_MS))
  expect(hook.result.current.status).toBe("ready")
})

it("also times out stalled user registration, then recovers when it completes", async () => {
  vi.useFakeTimers()
  let finish!: (value: string) => void
  vi.mocked(backend.runMutation).mockReturnValue(new Promise<string>((resolve) => { finish = resolve }))
  const hook = setup()
  act(() => { fake.setAuth.mock.lastCall![1](true) })
  act(() => vi.advanceTimersByTime(BACKEND_CONNECTION_TIMEOUT_MS))
  expect(hook.result.current.status).toBe("error")
  await act(async () => finish("user"))
  expect(hook.result.current.status).toBe("ready")
})

it("shows token refresh failures without mislabeling them as server rejection", async () => {
  const hook = setup()
  hook.getAccessToken.mockRejectedValue(new Error("Token refresh unavailable"))
  await act(async () => { expect(await fake.setAuth.mock.lastCall![0]({ forceRefreshToken: true })).toBeNull() })
  await hook.authChange(false)
  expect(hook.result.current).toMatchObject({ status: "error", message: "Token refresh unavailable" })
})

it("cancels the connection deadline and ignores callbacks after unmount", async () => {
  vi.useFakeTimers()
  const hook = setup()
  const callback = fake.setAuth.mock.lastCall![1]
  hook.unmount()
  expect(vi.getTimerCount()).toBe(0)
  await act(async () => callback(true))
  expect(backend.runMutation).not.toHaveBeenCalled()
  expect(fake.clearAuth).toHaveBeenCalledOnce()
})
