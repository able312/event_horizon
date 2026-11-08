import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { EstimateDetails } from "~/definitions/database"
import ProposalDetailsDialog from "./ProposalDetailsDialog"

const details: EstimateDetails = {
  id: "details-1",
  eventId: "event-1",
  introNote: null,
  validUntil: null,
  terms: null,
  depositKind: "percent",
  depositAmountCents: null,
  depositPercent: 25,
  depositDueDate: null,
  depositNote: null,
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: null,
}

function renderDialog() {
  const props = {
    onOpenChange: vi.fn(),
    onUpdate: vi.fn(),
    onSaveVenueDefault: vi.fn(),
  }
  render(
    <ProposalDetailsDialog
      open
      details={details}
      venueDefaultTerms="Venue terms"
      grandTotal={{ lowCents: 100000, highCents: 120000 }}
      {...props}
    />,
  )
  return props
}

afterEach(cleanup)

describe("ProposalDetailsDialog", () => {
  it("saves only what changed when Save is pressed", () => {
    const { onUpdate, onSaveVenueDefault, onOpenChange } = renderDialog()

    expect(screen.getByText("Deposit on the current totals: 25% of the grand total: $250.00 – $300.00")).toBeTruthy()
    fireEvent.change(screen.getByLabelText("Intro note"), { target: { value: "Thank you!" } })
    expect(onUpdate).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "Save" }))
    expect(onUpdate).toHaveBeenCalledWith({ introNote: "Thank you!" })
    expect(onSaveVenueDefault).not.toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("discards the draft on Cancel", () => {
    const { onUpdate, onOpenChange } = renderDialog()

    fireEvent.change(screen.getByLabelText("Intro note"), { target: { value: "Thank you!" } })
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(onUpdate).not.toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("saves the terms as the venue default only on Save", () => {
    const { onUpdate, onSaveVenueDefault } = renderDialog()

    fireEvent.change(screen.getByLabelText(/Terms/), { target: { value: "New venue terms" } })
    fireEvent.click(screen.getByRole("button", { name: "Save as venue default" }))
    expect(onSaveVenueDefault).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "Save" }))
    expect(onSaveVenueDefault).toHaveBeenCalledWith("New venue terms")
    // The event already follows the default, so it has nothing of its own to change
    expect(onUpdate).not.toHaveBeenCalled()
  })
})
