import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { CreateEventModal } from "./CreateEventModal"

function createDeferred<T>() {
  let resolve: (value: T | PromiseLike<T>) => void = () => undefined
  let reject: (reason?: unknown) => void = () => undefined
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

afterEach(() => {
  vi.clearAllMocks()
  cleanup()
})

describe("CreateEventModal save timing", () => {
  it("closes only after onCreate resolves", async () => {
    const onOpenChange = vi.fn()
    const deferredCreate = createDeferred<void>()
    const onCreate = vi.fn(() => deferredCreate.promise)

    render(
      <CreateEventModal
        open={true}
        onOpenChange={onOpenChange}
        onCreate={onCreate}
      />,
    )

    fireEvent.change(screen.getByPlaceholderText("e.g., Smith Wedding"), {
      target: { value: "Test Event" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Create" }))

    expect(onCreate).toHaveBeenCalledTimes(1)
    expect(onOpenChange).not.toHaveBeenCalled()

    deferredCreate.resolve()

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it("does not close when onCreate rejects", async () => {
    const onOpenChange = vi.fn()
    const onCreate = vi.fn(async () => {
      throw new Error("create failed")
    })

    render(
      <CreateEventModal
        open={true}
        onOpenChange={onOpenChange}
        onCreate={onCreate}
      />,
    )

    fireEvent.change(screen.getByPlaceholderText("e.g., Smith Wedding"), {
      target: { value: "Test Event" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Create" }))

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledTimes(1)
    })
    expect(onOpenChange).not.toHaveBeenCalled()
  })
})
