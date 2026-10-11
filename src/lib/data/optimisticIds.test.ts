import { describe, expect, it } from "vitest"
import { createWithClientId, getRecordRenderKey, resolveRecordId } from "./optimisticIds"

describe("optimistic IDs", () => {
  it("waits for create before sending subsequent edits and preserves the render key", async () => {
    let complete!: (value: { id: string }) => void
    const create = createWithClientId("temporary", () => new Promise<{ id: string }>((resolve) => { complete = resolve }))
    let resolved = false
    const edit = resolveRecordId("temporary").then((id) => { resolved = true; return id })
    await Promise.resolve()
    expect(resolved).toBe(false)
    expect(getRecordRenderKey("temporary")).toBe("temporary")
    complete({ id: "server" })
    expect(await create).toEqual({ id: "server" })
    expect(await edit).toBe("server")
    expect(await resolveRecordId("temporary")).toBe("server")
    expect(getRecordRenderKey("server")).toBe("temporary")
  })
  it("rejects waiting edits when creation fails", async () => {
    let fail!: (error: Error) => void
    const create = createWithClientId("failed", () => new Promise<{ id: string }>((_, reject) => { fail = reject }))
    const edit = resolveRecordId("failed")
    const error = new Error("Create failed")
    const checks = [expect(create).rejects.toBe(error), expect(edit).rejects.toBe(error)]
    fail(error)
    await Promise.all(checks)
    expect(await resolveRecordId("failed")).toBe("failed")
  })
  it("handles failures even when no edit is waiting", async () => {
    await expect(createWithClientId("failed-without-edit", async () => { throw new Error("Failure") })).rejects.toThrow("Failure")
  })
  it("passes server IDs and creates without client IDs through", async () => {
    expect(await resolveRecordId("existing")).toBe("existing")
    expect(getRecordRenderKey("existing")).toBe("existing")
    expect(await createWithClientId(undefined, async () => ({ id: "new" }))).toEqual({ id: "new" })
  })
})
