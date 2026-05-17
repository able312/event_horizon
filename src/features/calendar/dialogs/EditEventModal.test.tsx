import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { Event } from "~/definitions/database"
import { EditEventModal } from "./EditEventModal"

function createDeferred<T>() {
  let resolve: (value: T | PromiseLike<T>) => void = () => undefined
  let reject: (reason?: unknown) => void = () => undefined
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "event-1",
    title: "Event 1",
    type: "function",
    status: "new_lead",
    createdAt: "created",
    updatedAt: null,
    ...overrides,
  } as Event
}

afterEach(() => {
  vi.clearAllMocks()
  cleanup()
})

describe("EditEventModal save timing", () => {
  it("closes only after onSave resolves", async () => {
    const onOpenChange = vi.fn()
    const deferredSave = createDeferred<void>()
    const onSave = vi.fn(() => deferredSave.promise)

    render(
      <EditEventModal
        open={true}
        onOpenChange={onOpenChange}
        event={makeEvent()}
        onSave={onSave}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onOpenChange).not.toHaveBeenCalled()

    deferredSave.resolve()

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it("does not close when onSave rejects", async () => {
    const onOpenChange = vi.fn()
    const onSave = vi.fn(async () => {
      throw new Error("save failed")
    })

    render(
      <EditEventModal
        open={true}
        onOpenChange={onOpenChange}
        event={makeEvent()}
        onSave={onSave}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1)
    })
    expect(onOpenChange).not.toHaveBeenCalled()
  })
})
