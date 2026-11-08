import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { Event } from "~/definitions/database"
import FinancialsWorkspace from "./FinancialsWorkspace"

const navigateMock = vi.hoisted(() => vi.fn())

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router")
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useLocation: () => ({ pathname: "/events/event-1/financial", search: "?returnTo=%2Fcontacts%2Fcontact-1", hash: "" }),
  }
})
vi.mock("./FinancialWorkspaceSection", () => ({ default: () => <div>Estimate View</div> }))
vi.mock("./InvoiceWorkspaceSection", () => ({ default: () => <div>Invoice View</div> }))
vi.mock("~/features/event-detail/sections/financial-workspace/ProposalDetailsButton", () => ({
  default: () => <button type="button">Proposal Details</button>,
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("FinancialsWorkspace", () => {
  it("offers the preview that matches the selected view", () => {
    render(
      <FinancialsWorkspace
        eventResource={{
          event: { id: "event-1" } as Event,
          isLoading: false,
          updateEvent: vi.fn(),
          deleteEvent: vi.fn(),
        }}
        onSelectWorkspaceNode={vi.fn()}
      />,
    )

    expect(screen.getByText("Estimate View")).toBeTruthy()
    // Proposal details belong to the estimate, so they sit beside its Generate button
    expect(screen.getByRole("button", { name: "Proposal Details" })).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Generate Estimate" }))
    expect(navigateMock).toHaveBeenLastCalledWith(
      "/preview/event-1?type=financial-report&returnTo=%2Fevents%2Fevent-1%2Ffinancial%3FreturnTo%3D%252Fcontacts%252Fcontact-1",
    )

    fireEvent.click(screen.getByRole("radio", { name: "Invoice" }))
    expect(screen.getByText("Invoice View")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Proposal Details" })).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Generate Invoice" }))
    expect(navigateMock).toHaveBeenLastCalledWith(
      "/preview/event-1?type=invoice&returnTo=%2Fevents%2Fevent-1%2Ffinancial%3FreturnTo%3D%252Fcontacts%252Fcontact-1",
    )
  })
})
