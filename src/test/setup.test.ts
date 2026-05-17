import { describe, expect, it } from "vitest"
import { toast } from "sonner"

describe("test setup", () => {
  it("provides a safe window.electron mock", async () => {
    expect(window.electron).toBeDefined()
    expect(window.electron.ipcRenderer).toBeDefined()

    await expect(
      window.electron.ipcRenderer.invoke("events:get-many"),
    ).resolves.toBeUndefined()
    expect(() => window.electron.ipcRenderer.send("generate:active")).not.toThrow()
    expect(() => window.electron.ipcRenderer.on("navigate", () => {})).not.toThrow()
    expect(() =>
      window.electron.ipcRenderer.removeListener("navigate", () => {}),
    ).not.toThrow()
  })

  it("provides callable sonner toast mocks", () => {
    expect(() => toast.error("Error toast")).not.toThrow()
    expect(() => toast.success("Success toast")).not.toThrow()
    expect(() => toast.loading("Loading toast")).not.toThrow()
    expect(() => toast.info("Info toast")).not.toThrow()
    expect(() => toast.warning("Warning toast")).not.toThrow()
    expect(() => toast.dismiss()).not.toThrow()
  })
})
