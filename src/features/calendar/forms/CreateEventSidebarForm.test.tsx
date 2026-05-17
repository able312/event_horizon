import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { CreateEventSidebarForm } from "./CreateEventSidebarForm"

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

describe("CreateEventSidebarForm save timing", () => {
  it("calls onCancel only after onCreate resolves", async () => {
    const onCancel = vi.fn()
    const deferredCreate = createDeferred<void>()
    const onCreate = vi.fn(() => deferredCreate.promise)

    render(<CreateEventSidebarForm onCreate={onCreate} onCancel={onCancel} />)

    fireEvent.change(screen.getByPlaceholderText("e.g., Smith Wedding"), {
      target: { value: "Test Event" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Create" }))

    expect(onCreate).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()

    deferredCreate.resolve()

    await waitFor(() => {
      expect(onCancel).toHaveBeenCalledTimes(1)
    })
  })

  it("does not call onCancel when onCreate rejects", async () => {
    const onCancel = vi.fn()
    const onCreate = vi.fn(async () => {
      throw new Error("create failed")
    })

    render(<CreateEventSidebarForm onCreate={onCreate} onCancel={onCancel} />)

    fireEvent.change(screen.getByPlaceholderText("e.g., Smith Wedding"), {
      target: { value: "Test Event" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Create" }))

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledTimes(1)
    })
    expect(onCancel).not.toHaveBeenCalled()
  })

  it("uses provided initial date values in create payload", async () => {
    const onCancel = vi.fn()
    const onCreate = vi.fn(async () => undefined)
    const startIso = "2026-07-14T15:30:45.123Z"
    const endIso = "2026-07-14T15:30:45.123Z"

    render(
      <CreateEventSidebarForm
        initialStartDateTime={startIso}
        initialEndDateTime={endIso}
        onCreate={onCreate}
        onCancel={onCancel}
      />,
    )

    fireEvent.change(screen.getByPlaceholderText("e.g., Smith Wedding"), {
      target: { value: "Seeded Date Event" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Create" }))

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledTimes(1)
    })

    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        startDateTime: startIso,
        endDateTime: endIso,
      }),
    )
  })

  it("uses latest initial date when remounted with a different prefill", async () => {
    const onCancel = vi.fn()
    const onCreate = vi.fn(async () => undefined)
    const firstIso = "2026-07-14T15:30:45.123Z"
    const secondIso = "2026-07-15T15:30:45.123Z"

    const first = render(
      <CreateEventSidebarForm
        initialStartDateTime={firstIso}
        initialEndDateTime={firstIso}
        onCreate={onCreate}
        onCancel={onCancel}
      />,
    )
    first.unmount()

    render(
      <CreateEventSidebarForm
        initialStartDateTime={secondIso}
        initialEndDateTime={secondIso}
        onCreate={onCreate}
        onCancel={onCancel}
      />,
    )

    fireEvent.change(screen.getByPlaceholderText("e.g., Smith Wedding"), {
      target: { value: "New Prefill Event" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Create" }))

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledTimes(1)
    })

    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        startDateTime: secondIso,
        endDateTime: secondIso,
      }),
    )
  })

  it("autofocuses the title input on mount", () => {
    render(<CreateEventSidebarForm onCreate={vi.fn(async () => undefined)} onCancel={vi.fn()} />)

    expect(document.activeElement).toBe(screen.getByPlaceholderText("e.g., Smith Wedding"))
  })

  it("emits initial and updated draft previews", async () => {
    const onDraftPreviewChange = vi.fn()

    render(
      <CreateEventSidebarForm
        initialStartDateTime="2026-07-14T15:30:45.123Z"
        onCreate={vi.fn(async () => undefined)}
        onCancel={vi.fn()}
        onDraftPreviewChange={onDraftPreviewChange}
      />,
    )

    await waitFor(() => {
      expect(onDraftPreviewChange).toHaveBeenCalledWith({
        title: "Untitled",
        startDateTime: "2026-07-14T15:30:45.123Z",
      })
    })

    fireEvent.change(screen.getByPlaceholderText("e.g., Smith Wedding"), {
      target: { value: "Draft Wedding" },
    })

    await waitFor(() => {
      expect(onDraftPreviewChange).toHaveBeenLastCalledWith({
        title: "Draft Wedding",
        startDateTime: "2026-07-14T15:30:45.123Z",
      })
    })
  })

  it("emits updated draft preview when start date changes", async () => {
    const onDraftPreviewChange = vi.fn()
    const startIso = "2026-07-14T15:30:45.123Z"

    const { container } = render(
      <CreateEventSidebarForm
        initialStartDateTime={startIso}
        initialEndDateTime={startIso}
        onCreate={vi.fn(async () => undefined)}
        onCancel={vi.fn()}
        onDraftPreviewChange={onDraftPreviewChange}
      />,
    )

    const dateInputs = Array.from(
      container.querySelectorAll<HTMLInputElement>("#date-picker-input"),
    )
    expect(dateInputs.length).toBeGreaterThan(0)

    fireEvent.change(dateInputs[0], { target: { value: "July 20, 2026" } })

    await waitFor(() => {
      const latestCall =
        onDraftPreviewChange.mock.calls[onDraftPreviewChange.mock.calls.length - 1][0]
      expect(latestCall?.title).toBe("Untitled")
      expect(latestCall?.startDateTime).not.toBe(startIso)
    })
  })

  it("emits null preview on cancel", async () => {
    const onDraftPreviewChange = vi.fn()
    const onCancel = vi.fn()

    render(
      <CreateEventSidebarForm
        onCreate={vi.fn(async () => undefined)}
        onCancel={onCancel}
        onDraftPreviewChange={onDraftPreviewChange}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

    await waitFor(() => {
      expect(onDraftPreviewChange).toHaveBeenCalledWith(null)
    })
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it("emits null during submit and restores draft on create failure", async () => {
    const deferredCreate = createDeferred<void>()
    const onCreate = vi.fn(() => deferredCreate.promise)
    const onDraftPreviewChange = vi.fn()

    render(
      <CreateEventSidebarForm
        onCreate={onCreate}
        onCancel={vi.fn()}
        onDraftPreviewChange={onDraftPreviewChange}
      />,
    )

    fireEvent.change(screen.getByPlaceholderText("e.g., Smith Wedding"), {
      target: { value: "Retry Draft" },
    })

    await waitFor(() => {
      expect(onDraftPreviewChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ title: "Retry Draft" }),
      )
    })

    fireEvent.click(screen.getByRole("button", { name: "Create" }))

    await waitFor(() => {
      expect(onDraftPreviewChange).toHaveBeenLastCalledWith(null)
    })

    deferredCreate.reject(new Error("create failed"))

    await waitFor(() => {
      expect(onDraftPreviewChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ title: "Retry Draft" }),
      )
    })
  })
})
