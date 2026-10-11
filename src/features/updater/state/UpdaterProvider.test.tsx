import { StrictMode, type PropsWithChildren } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import type { UpdaterSnapshot } from "../../../definitions/updater"
import { UpdaterProvider } from "./UpdaterProvider"
import { useUpdater } from "./useUpdater"
import { ACTIONS } from "./updaterReducer"

afterEach(() => { delete window.api; vi.unstubAllEnvs() })

function wrapper({ children }: PropsWithChildren) {
  return <StrictMode><UpdaterProvider>{children}</UpdaterProvider></StrictMode>
}

it("recovers real state under Strict Mode without duplicate listeners or announcements", async () => {
  vi.stubEnv("DEV", false)
  const listeners = new Set<(snapshot: UpdaterSnapshot) => void>()
  window.api = {
    updater: {
      getStatus: vi.fn(async () => ({ revision: 2, status: { phase: "ready", version: "0.1.1" } } as const)),
      onStatusChanged: listener => { listeners.add(listener); return () => { listeners.delete(listener) } },
      restartAndInstall: vi.fn(),
    },
    auth: { getStatus: vi.fn(), signIn: vi.fn(), signOut: vi.fn(), getAccessToken: vi.fn(), onStatusChanged: vi.fn() },
  }
  const hook = renderHook(() => useUpdater(), { wrapper })
  await waitFor(() => expect(hook.result.current.updater.status.phase).toBe("ready"))
  expect(listeners.size).toBe(1)
  act(() => { hook.result.current.dispatch({ type: ACTIONS.READY_ANNOUNCED }) })
  act(() => { for (const listener of listeners) listener({ revision: 3, status: { phase: "ready", version: "0.1.1" } }) })
  expect(hook.result.current.updater.readyAnnounced).toBe(true)
  hook.rerender()
  expect(listeners.size).toBe(1)
  hook.unmount()
  expect(listeners.size).toBe(0)
})

it("keeps development simulation independent of the main updater", () => {
  vi.stubEnv("DEV", true)
  const subscribe = vi.fn()
  window.api = {
    updater: { getStatus: vi.fn(), onStatusChanged: subscribe, restartAndInstall: vi.fn() },
    auth: { getStatus: vi.fn(), signIn: vi.fn(), signOut: vi.fn(), getAccessToken: vi.fn(), onStatusChanged: vi.fn() },
  }
  const hook = renderHook(() => useUpdater(), { wrapper })
  act(() => { hook.result.current.dispatch({ type: ACTIONS.STATUS_CHANGED, status: { phase: "ready", version: "simulated" } }) })
  expect(subscribe).not.toHaveBeenCalled()
  expect(hook.result.current.updater.status).toEqual({ phase: "ready", version: "simulated" })
})
