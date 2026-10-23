import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { ComponentProps } from "react"

import type { EventRequest } from "~/definitions/database"
import InboxBody from "./InboxBody"

const request = { id: "req-1" } as EventRequest
let requests: EventRequest[] = [request]
const dismissRequest = vi.fn()

vi.mock("~/features/event-requests/hooks/useEventRequests", () => ({
  useEventRequests: () => ({ requests, dismissRequest }),
}))

vi.mock("~/features/event-requests/components/RequestDetailView", () => ({
  default: ({ request }: { request: EventRequest }) => <div>Request {request.id}</div>,
}))

function props(overrides: Partial<ComponentProps<typeof InboxBody>> = {}): ComponentProps<typeof InboxBody> {
  return {
    selectedRequestId: request.id,
    reviewingRequestId: null,
    onBack: vi.fn(),
    onReviewRequest: vi.fn(),
    onDismissRequest: vi.fn(),
    ...overrides,
  }
}

afterEach(() => {
  cleanup()
  requests = [request]
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
    expect(screen.getByText("Select a request to see what the client sent.")).toBeTruthy()
    expect(screen.queryByText("Request req-1")).toBeNull()
    expect(screen.queryByRole("button", { name: "Review" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Dismiss" })).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Back to Calendar" }))
    expect(input.onBack).toHaveBeenCalledOnce()
  })
})
