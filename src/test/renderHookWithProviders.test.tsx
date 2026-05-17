import { useQuery } from "@tanstack/react-query"
import { waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { renderHookWithProviders } from "~/test/renderHookWithProviders"

describe("renderHookWithProviders", () => {
  it("mounts a react query hook with providers", async () => {
    const queryFn = vi.fn(async () => "hello")
    const { result } = renderHookWithProviders(() =>
      useQuery({
        queryKey: ["greeting"],
        queryFn,
      }),
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBe("hello")
    expect(queryFn).toHaveBeenCalledTimes(1)
  })

  it("disables retries for query tests", async () => {
    const queryFn = vi.fn(async () => {
      throw new Error("failed query")
    })

    const { result } = renderHookWithProviders(() =>
      useQuery({
        queryKey: ["retry-disabled"],
        queryFn,
      }),
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(queryFn).toHaveBeenCalledTimes(1)
  })

  it("creates a fresh query client per helper call", async () => {
    const firstQueryFn = vi.fn(async () => "first")
    const first = renderHookWithProviders(() =>
      useQuery({
        queryKey: ["shared-key"],
        queryFn: firstQueryFn,
      }),
    )

    await waitFor(() => expect(first.result.current.isSuccess).toBe(true))
    expect(firstQueryFn).toHaveBeenCalledTimes(1)
    first.unmount()

    const secondQueryFn = vi.fn(async () => "second")
    const second = renderHookWithProviders(() =>
      useQuery({
        queryKey: ["shared-key"],
        queryFn: secondQueryFn,
      }),
    )

    await waitFor(() => expect(second.result.current.isSuccess).toBe(true))
    expect(secondQueryFn).toHaveBeenCalledTimes(1)
    expect(second.queryClient).not.toBe(first.queryClient)
  })
})
