import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import PaymentsSection from "./PaymentsSection"

const hookMock = vi.hoisted(() => ({
  usePaymentsSection: vi.fn(),
}))

vi.mock("~/hooks/usePaymentsSection", () => ({
  usePaymentsSection: hookMock.usePaymentsSection,
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("PaymentsSection", () => {
  it("converts amount dollars input to cents on blur", async () => {
    const updatePayment = vi.fn()

    hookMock.usePaymentsSection.mockReturnValue({
      data: [
        {
          id: "pay-1",
          amountCents: 1234,
          date: "2026-10-15T00:00:00.000Z",
          recieptNumber: "R-1",
          notes: "Deposit",
        },
      ],
      isLoading: false,
      createPaymentAsync: vi.fn(async () => ({ id: "new" })),
      updatePayment,
      deletePaymentAsync: vi.fn(async () => true),
    })

    render(<PaymentsSection />)

    const paymentsTable = screen.getByRole("table")
    expect(paymentsTable.className).toContain("table-fixed")
    expect(paymentsTable.className).not.toContain("min-w-[620px]")

    const dateInput = screen.getByDisplayValue("2026-10-15")
    const amountInput = screen.getByDisplayValue("12.34")
    const receiptInput = screen.getByDisplayValue("R-1")
    const notesInput = screen.getByDisplayValue("Deposit")

    expect(dateInput.className).toContain("w-full")
    expect(amountInput.className).toContain("w-full")
    expect(receiptInput.className).toContain("w-full")
    expect(notesInput.className).toContain("w-full")
    expect(notesInput.className).not.toContain("min-w-28")

    fireEvent.change(amountInput, { target: { value: "45.67" } })
    fireEvent.blur(amountInput)

    expect(screen.getByText("Payments Total: $12.34")).toBeTruthy()
    expect(screen.queryByText("Payments total in table is reflected in the financial summary above.")).toBeNull()

    await waitFor(() => {
      expect(updatePayment).toHaveBeenCalledWith({
        id: "pay-1",
        updates: { amountCents: 4567 },
      })
    })
  })

  it("adds a payment from add action", async () => {
    const createPaymentAsync = vi.fn(async () => ({ id: "new" }))

    hookMock.usePaymentsSection.mockReturnValue({
      data: [],
      isLoading: false,
      createPaymentAsync,
      updatePayment: vi.fn(),
      deletePaymentAsync: vi.fn(async () => true),
    })

    render(<PaymentsSection />)

    fireEvent.click(screen.getAllByRole("button", { name: /Add Payment/i })[0])

    await waitFor(() => {
      expect(createPaymentAsync).toHaveBeenCalledTimes(1)
    })
  })

  it("shows generate estimate CTA in workspace empty state", () => {
    const onGenerateEstimate = vi.fn()

    hookMock.usePaymentsSection.mockReturnValue({
      data: [],
      isLoading: false,
      createPaymentAsync: vi.fn(async () => ({ id: "new" })),
      updatePayment: vi.fn(),
      deletePaymentAsync: vi.fn(async () => true),
    })

    render(<PaymentsSection emptyStateMode="workspace" onGenerateEstimate={onGenerateEstimate} />)

    fireEvent.click(screen.getByRole("button", { name: "Generate Estimate" }))
    expect(onGenerateEstimate).toHaveBeenCalledTimes(1)
  })
})
