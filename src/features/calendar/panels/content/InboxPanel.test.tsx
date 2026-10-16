import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { EventRequest } from "~/definitions/database"

import InboxPanel from "./InboxPanel"

const request = (id: string, eventName: string, firstName: string) =>
  ({
    id, submittedAt: "2026-10-16T15:00:00.000Z", receivedAt: "2026-10-16T15:00:01.000Z", eventName, firstName, lastName: "Smith", organizationName: null,
    email: `${firstName.toLowerCase()}@example.test`, phone: "555-0100", eventType: "wedding", preferredDate: null,
    guestCount: 80, details: null, extraAnswers: [],
  }) as unknown as EventRequest
const okQuery = () => ({ isLoading: false, isError: false, isFetching: false, refetch: vi.fn() })

function renderPanel(overrides: Partial<React.ComponentProps<typeof InboxPanel>> = {}) {
  const props: React.ComponentProps<typeof InboxPanel> = {
    requests: [request("req-1", "Sarah's 40th", "Sarah"), request("req-2", "Spring wedding", "Jane")],
    requestsQuery: okQuery(),
    selectedRequestId: "req-2",
    onSelectRequest: vi.fn(),
    ...overrides,
  }
  render(<InboxPanel {...props} />)
  return props
}

afterEach(cleanup)

describe("InboxPanel", () => {
  it("lists requests with their count, and marks the open request", () => {
    renderPanel()
    expect(screen.getByRole("heading", { name: "Requests (2)" })).toBeTruthy()
    expect(screen.getByRole("button", { name: /Spring wedding/ }).getAttribute("aria-current")).toBe("true")
    expect(screen.getByRole("button", { name: /Sarah's 40th/ }).getAttribute("aria-current")).toBeNull()
  })

  it("opens a request when clicked", () => {
    const props = renderPanel()
    fireEvent.click(screen.getByRole("button", { name: /Sarah's 40th/ }))
    expect(props.onSelectRequest).toHaveBeenCalledWith(props.requests[0])
  })

  it("searches the requests", () => {
    renderPanel()
    fireEvent.change(screen.getByRole("textbox", { name: "Search inbox" }), { target: { value: "jane" } })
    expect(screen.queryByRole("button", { name: /Sarah's 40th/ })).toBeNull()
    expect(screen.getByRole("button", { name: /Spring wedding/ })).toBeTruthy()

    fireEvent.change(screen.getByRole("textbox", { name: "Search inbox" }), { target: { value: "nobody" } })
    expect(screen.getByText("No matches.")).toBeTruthy()
  })

  it("says when there is nothing waiting", () => {
    renderPanel({ requests: [] })
    expect(screen.getByText("No new requests from the website.")).toBeTruthy()
  })

  it("shows a retryable error instead of an empty list when the query fails", () => {
    const requestsQuery = { ...okQuery(), isError: true }
    renderPanel({ requests: [], requestsQuery })

    expect(screen.getByRole("alert").textContent).toContain("Could not load website requests.")
    fireEvent.click(screen.getByRole("button", { name: "Retry" }))
    expect(requestsQuery.refetch).toHaveBeenCalled()
  })
})
