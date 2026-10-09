import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, expect, it, vi } from "vitest"
import * as backend from "./backend"
import { useBackendSession } from "./session"

const fake = vi.hoisted(() => ({ setAuth: vi.fn(), clearAuth: vi.fn() }))
vi.mock("./backend", async (original) => ({ ...await original<typeof backend>(), getConvexClient: () => fake, isBackendConfigured: vi.fn(() => true), runMutation: vi.fn() }))
beforeEach(() => { vi.clearAllMocks(); vi.mocked(backend.isBackendConfigured).mockReturnValue(true); vi.mocked(backend.runMutation).mockResolvedValue("user") })
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
  expect(fake.clearAuth).toHaveBeenCalledOnce()
  expect(hook.cache.getQueryData(["private"])).toBeUndefined()
  await act(async () => finish("user"))
  await waitFor(() => expect(hook.result.current.status).toBe("signed-out"))
})
