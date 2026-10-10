import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { Event } from "~/definitions/database"
import EditEventSidebarForm from "./EditEventSidebarForm"

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

function titleInput(): HTMLInputElement {
  return screen.getByPlaceholderText("e.g., Smith Wedding") as HTMLInputElement
}

function editTitle(title: string) {
  fireEvent.change(titleInput(), { target: { value: title } })
}

afterEach(() => {
  vi.clearAllMocks()
  cleanup()
})

describe("EditEventSidebarForm save timing", () => {
  it("calls onCancel only after onSave resolves", async () => {
    const onCancel = vi.fn()
    const deferredSave = createDeferred<void>()
    const onSave = vi.fn(() => deferredSave.promise)

    render(<EditEventSidebarForm event={makeEvent()} onSave={onSave} onCancel={onCancel} />)

    editTitle("Renamed")
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()

    deferredSave.resolve()

    await waitFor(() => {
      expect(onCancel).toHaveBeenCalledTimes(1)
    })
  })

  it("does not call onCancel when onSave rejects", async () => {
    const onCancel = vi.fn()
    const onSave = vi.fn(async () => {
      throw new Error("save failed")
    })

    render(<EditEventSidebarForm event={makeEvent()} onSave={onSave} onCancel={onCancel} />)

    editTitle("Renamed")
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1)
    })
    expect(onCancel).not.toHaveBeenCalled()
  })

  it("disables save when end is before start", () => {
    const onSave = vi.fn(async () => undefined)

    render(
      <EditEventSidebarForm
        event={makeEvent({
          startDateTime: "2026-07-14T16:00:00.000Z",
          endDateTime: "2026-07-14T15:00:00.000Z",
        })}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    )

    expect(
      (screen.getByRole("button", { name: "Save" }) as HTMLButtonElement).disabled,
    ).toBe(true)
    expect(screen.getByText("End must be on or after the start date")).toBeTruthy()
  })

  it("sends only the fields changed in the form", async () => {
    const onSave = vi.fn(async () => undefined)

    render(
      <EditEventSidebarForm
        event={makeEvent({ startDateTime: null, endDateTime: null, minGuests: 10 })}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    )

    editTitle("Renamed")
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({ title: "Renamed" })
    })
  })

  it("closes without saving when nothing changed", () => {
    const onSave = vi.fn(async () => undefined)
    const onCancel = vi.fn()

    render(<EditEventSidebarForm event={makeEvent()} onSave={onSave} onCancel={onCancel} />)

    editTitle("Event 1")
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(onSave).not.toHaveBeenCalled()
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it("keeps typed values when the event updates live, and shows other people's changes elsewhere", async () => {
    const onSave = vi.fn(async () => undefined)
    const { rerender } = render(<EditEventSidebarForm event={makeEvent()} onSave={onSave} onCancel={vi.fn()} />)

    editTitle("My title")
    rerender(
      <EditEventSidebarForm
        event={makeEvent({ title: "Their title", status: "confirmed" })}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    )

    expect(titleInput().value).toBe("My title")
    expect((screen.getByDisplayValue("Confirmed") as HTMLSelectElement).value).toBe("confirmed")

    fireEvent.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({ title: "My title" })
    })
  })

  it("starts a fresh draft when a different event is opened", () => {
    const { rerender } = render(<EditEventSidebarForm event={makeEvent()} onSave={vi.fn()} onCancel={vi.fn()} />)

    editTitle("Draft for event 1")
    rerender(
      <EditEventSidebarForm event={makeEvent({ id: "event-2", title: "Event 2" })} onSave={vi.fn()} onCancel={vi.fn()} />,
    )

    expect(titleInput().value).toBe("Event 2")
  })
})
