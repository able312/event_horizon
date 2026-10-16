import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { Event, EventRequest } from "~/definitions/database"

import InboxPanel from "./InboxPanel"

const request = (id: string, eventName: string, firstName: string) =>
  ({
    id, submittedAt: "2026-10-16T15:00:00.000Z", eventName, firstName, lastName: "Smith", organizationName: null,
    email: `${firstName.toLowerCase()}@example.test`, phone: "555-0100", eventType: "wedding", preferredDate: null,
    guestCount: 80, details: null, extraAnswers: [],
  }) as unknown as EventRequest
const lead = { id: "evt-1", title: "Board dinner", type: "function", startDateTime: null, maxGuests: 20 } as Event
const okQuery = () => ({ isLoading: false, isError: false, isFetching: false, refetch: vi.fn() })

function renderPanel(overrides: Partial<React.ComponentProps<typeof InboxPanel>> = {}) {
  const props: React.ComponentProps<typeof InboxPanel> = {
    requests: [request("req-1", "Sarah's 40th", "Sarah"), request("req-2", "Spring wedding", "Jane")],
    requestsQuery: okQuery(),
    selectedRequestId: "req-2",
    onSelectRequest: vi.fn(),
    leads: [lead],
    leadsQuery: okQuery(),
    clientsByEventId: { "evt-1": { contactId: "c-1", displayName: "Morgan Reyes", email: null, phone: null } },
    onEditLead: vi.fn(),
    onDeleteLead: vi.fn(),
    ...overrides,
  }
  render(<InboxPanel {...props} />)
  return props
}

afterEach(cleanup)

describe("InboxPanel", () => {
  it("lists requests with their count above the new leads, and marks the open request", () => {
    renderPanel()
    expect(screen.getByRole("heading", { name: "Requests (2)" })).toBeTruthy()
    expect(screen.getByRole("heading", { name: "New leads (1)" })).toBeTruthy()
    expect(screen.getByRole("button", { name: /Spring wedding/ }).getAttribute("aria-current")).toBe("true")
    expect(screen.getByRole("button", { name: /Sarah's 40th/ }).getAttribute("aria-current")).toBeNull()
  })

  it("opens a request or a lead when clicked", () => {
    const props = renderPanel()
    fireEvent.click(screen.getByRole("button", { name: /Sarah's 40th/ }))
    expect(props.onSelectRequest).toHaveBeenCalledWith(props.requests[0])
    fireEvent.click(screen.getByRole("button", { name: /Board dinner/ }))
    expect(props.onEditLead).toHaveBeenCalledWith(lead)
  })

  it("searches requests and leads together", () => {
    renderPanel()
    fireEvent.change(screen.getByRole("textbox", { name: "Search inbox" }), { target: { value: "morgan" } })
    expect(screen.queryByRole("button", { name: /Sarah's 40th/ })).toBeNull()
    expect(screen.getByRole("button", { name: /Board dinner/ })).toBeTruthy()
    expect(screen.getByText("No matches.")).toBeTruthy()
  })

  it("says when there is nothing waiting", () => {
    renderPanel({ requests: [], leads: [] })
    expect(screen.getByText("No new requests from the website.")).toBeTruthy()
    expect(screen.getByText("No new leads.")).toBeTruthy()
  })

  it("shows a retryable error instead of an empty list when a query fails", () => {
    const requestsQuery = { ...okQuery(), isError: true }
    const leadsQuery = { ...okQuery(), isError: true }
    renderPanel({ requests: [], leads: [], requestsQuery, leadsQuery })

    const alerts = screen.getAllByRole("alert").map((alert) => alert.textContent)
    expect(alerts[0]).toContain("Could not load website requests.")
    expect(alerts[1]).toContain("Could not load new leads.")
    const [retryRequests, retryLeads] = screen.getAllByRole("button", { name: "Retry" })
    fireEvent.click(retryRequests!)
    fireEvent.click(retryLeads!)
    expect(requestsQuery.refetch).toHaveBeenCalled()
    expect(leadsQuery.refetch).toHaveBeenCalled()
  })
})
