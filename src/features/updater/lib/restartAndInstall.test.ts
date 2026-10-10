import { afterEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"
import { restartAndInstall } from "./restartAndInstall"

afterEach(() => { vi.unstubAllEnvs(); delete window.api })

describe("restart orchestration", () => {
  function bridge() {
    const install = vi.fn(async () => undefined)
    window.api = {
      updater: { getStatus: vi.fn(), onStatusChanged: vi.fn(), restartAndInstall: install },
      auth: { getStatus: vi.fn(), signIn: vi.fn(), signOut: vi.fn(), getAccessToken: vi.fn(), onStatusChanged: vi.fn() },
    }
    return install
  }

  it("keeps simulated updates isolated from installation", async () => {
    vi.stubEnv("DEV", true)
    const install = bridge()
    await restartAndInstall()
    expect(install).not.toHaveBeenCalled()
    expect(toast.info).toHaveBeenCalled()
  })

  it("requests installation in production and reports rejected IPC calls without raw details", async () => {
    vi.stubEnv("DEV", false)
    const install = bridge()
    await restartAndInstall()
    expect(install).toHaveBeenCalledOnce()
    install.mockRejectedValueOnce(new Error("internal file path"))
    await restartAndInstall()
    expect(toast.error).toHaveBeenCalledWith(expect.not.stringContaining("internal"))
  })

  it("reports a missing bridge", async () => {
    vi.stubEnv("DEV", false)
    delete window.api
    await restartAndInstall()
    expect(toast.error).toHaveBeenCalled()
  })
})
