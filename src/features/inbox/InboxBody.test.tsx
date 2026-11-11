import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { ComponentProps } from "react"

import type { EventNotification, EventRequest } from "~/definitions/database"
import InboxBody from "./InboxBody"

const request = { id: "req-1" } as EventRequest
let requests: EventRequest[] = [request]
const dismissRequest = vi.fn()
const notification: EventNotification = {
  id: "n-1", kind: "updated", eventId: "event-1", eventTitle: "Smith Wedding", eventExists: true,
  changes: [{ field: "status", from: "tentative", to: "confirmed" }], actorName: "Tess",
  createdAt: "2026-11-10T15:00:00.000Z", updatedAt: "2026-11-10T15:00:00.000Z", read: false,
}
let notifications: EventNotification[] = [notification]
const markRead = vi.fn()
const dismissNotification = vi.fn()

vi.mock("~/features/event-requests/hooks/useEventRequests", () => ({
  useEventRequests: () => ({ requests, dismissRequest }),
}))
vi.mock("~/features/event-notifications/hooks/useEventNotifications", () => ({
  useEventNotifications: () => ({ notifications, markRead, dismiss: dismissNotification }),
}))

vi.mock("~/features/event-requests/components/RequestDetailView", () => ({
  default: ({ request }: { request: EventRequest }) => <div>Request {request.id}</div>,
}))

function props(overrides: Partial<ComponentProps<typeof InboxBody>> = {}): ComponentProps<typeof InboxBody> {
  return {
    selectedRequestId: request.id,
    selectedNotificationId: null,
    reviewingRequestId: null,
    onBack: vi.fn(),
    onReviewRequest: vi.fn(),
    onDismissRequest: vi.fn(),
    onDismissNotification: vi.fn(),
    onOpenEvent: vi.fn(),
    ...overrides,
  }
}

afterEach(() => {
  cleanup()
  requests = [request]
  notifications = [notification]
  vi.clearAllMocks()
})

describe("InboxBody", () => {
  it("reviews the selected request and clears the host workspace before dismissing", () => {
    const input = props()
    input.onDismissRequest = vi.fn(() => expect(dismissRequest).not.toHaveBeenCalled())
    render(<InboxBody {...input} />)

    fireEvent.click(screen.getByRole("button", { name: "Review" }))
    expect(input.onReviewRequest).toHaveBeenCalledWith(request)

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }))
    expect(input.onDismissRequest).toHaveBeenCalledWith(request.id)
    expect(dismissRequest).toHaveBeenCalledWith(request.id)
  })

  it("only marks the selected request as reviewing when its own form is open", () => {
    const input = props({ reviewingRequestId: "other-request" })
    const { rerender } = render(<InboxBody {...input} />)
    expect(screen.getByRole("button", { name: "Review" })).toBeTruthy()

    rerender(<InboxBody {...input} reviewingRequestId={request.id} />)
    expect(screen.getByText("Reviewing")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Review" })).toBeNull()
  })

  it("removes details and actions when a selected request leaves the pending list", () => {
    const input = props()
    const { rerender } = render(<InboxBody {...input} />)
    expect(screen.getByText("Request req-1")).toBeTruthy()

    requests = []
    rerender(<InboxBody {...input} />)
    expect(screen.getByText("Select a request or an update to see the details.")).toBeTruthy()
    expect(screen.queryByText("Request req-1")).toBeNull()
    expect(screen.queryByRole("button", { name: "Review" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Dismiss" })).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Back to Calendar" }))
    expect(input.onBack).toHaveBeenCalledOnce()
  })

  it("shows the selected update, marks it read, and opens its event or dismisses it", () => {
    const input = props({ selectedRequestId: null, selectedNotificationId: notification.id })
    input.onDismissNotification = vi.fn(() => expect(dismissNotification).not.toHaveBeenCalled())
    render(<InboxBody {...input} />)

    expect(screen.getByRole("heading", { name: "Smith Wedding" })).toBeTruthy()
    expect(screen.getByText("Tentative")).toBeTruthy()
    expect(screen.getByText("Confirmed")).toBeTruthy()
    expect(markRead).toHaveBeenCalledWith(notification.id)

    fireEvent.click(screen.getByRole("button", { name: "Open event" }))
    expect(input.onOpenEvent).toHaveBeenCalledWith("event-1")
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }))
    expect(input.onDismissNotification).toHaveBeenCalledWith(notification.id)
    expect(dismissNotification).toHaveBeenCalledWith(notification.id)
  })

  it("doesn't offer to open a deleted event, or mark a read update again", () => {
    notifications = [{ ...notification, kind: "deleted", eventExists: false, read: true }]
    render(<InboxBody {...props({ selectedRequestId: null, selectedNotificationId: notification.id })} />)
    expect(screen.queryByRole("button", { name: "Open event" })).toBeNull()
    expect(screen.getByText("This event was deleted, so it can no longer be opened.")).toBeTruthy()
    expect(markRead).not.toHaveBeenCalled()
  })
})
