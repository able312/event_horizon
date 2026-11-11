import { act, waitFor } from "@testing-library/react"
import { queryOptions } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"
import { toast } from "sonner"

import { renderHookWithProviders } from "~/test/renderHookWithProviders"

import { useOptimisticRecordList } from "./useOptimisticRecordList"

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

type Row = { id: string; name: string }

function createDeferred<T>() {
  let resolve: (value: T) => void = () => undefined
  let reject: (reason?: unknown) => void = () => undefined
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function setup(initial: Row[], api: Partial<{
  create: (input: { id: string; name: string }) => Promise<Row>
  update: (id: string, updates: Partial<Row>) => Promise<Row>
  remove: (id: string) => Promise<unknown>
}>) {
  const listQuery = queryOptions({ queryKey: ["rows"] as const, queryFn: async () => initial, staleTime: Infinity })
  const rendered = renderHookWithProviders(() => useOptimisticRecordList({
    listQuery,
    create: api.create ?? vi.fn(),
    optimisticRecord: (input: { id: string; name: string }) => ({ id: input.id, name: input.name }),
    update: api.update ?? vi.fn(),
    remove: api.remove ?? vi.fn(),
    errorMessages: { add: "Failed to add", save: "Failed to save", remove: "Failed to delete" },
  }))
  vi.spyOn(console, "error").mockImplementation(() => undefined)
  return rendered
}

describe("useOptimisticRecordList", () => {
  it("shows a new row at once and swaps in the created record", async () => {
    const created = createDeferred<Row>()
    const { result } = setup([{ id: "a", name: "A" }], { create: () => created.promise })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    act(() => result.current.add({ id: "client-1", name: "B" }))
    await waitFor(() => expect(result.current.records).toEqual([{ id: "a", name: "A" }, { id: "client-1", name: "B" }]))

    await act(async () => created.resolve({ id: "server-1", name: "B" }))
    await waitFor(() => expect(result.current.records.map((row) => row.id)).toEqual(["a", "server-1"]))
  })

  it("applies an edit at once and rolls it back with a toast when the save fails", async () => {
    const saved = createDeferred<Row>()
    const { result } = setup([{ id: "a", name: "A" }], { update: () => saved.promise })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    act(() => result.current.update({ id: "a", updates: { name: "Renamed" } }))
    await waitFor(() => expect(result.current.records[0].name).toBe("Renamed"))

    await act(async () => saved.reject(new Error("offline")))
    await waitFor(() => expect(result.current.records[0].name).toBe("A"))
    expect(toast.error).toHaveBeenCalledWith("Failed to save")
  })

  it("removes a row at once and restores it when the delete fails", async () => {
    const removed = createDeferred<boolean>()
    const { result } = setup([{ id: "a", name: "A" }, { id: "b", name: "B" }], { remove: () => removed.promise })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    act(() => result.current.remove("a"))
    await waitFor(() => expect(result.current.records.map((row) => row.id)).toEqual(["b"]))

    await act(async () => removed.reject(new Error("offline")))
    await waitFor(() => expect(result.current.records.map((row) => row.id)).toEqual(["a", "b"]))
    expect(toast.error).toHaveBeenCalledWith("Failed to delete")
  })
})
