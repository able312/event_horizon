import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("~/assets/Westlinks-SM-RGB.png", () => ({
  default: "/test-westlinks-logo.png",
}))

vi.mock("~/assets/SILO-SM-RGB.png", () => ({
  default: "/test-silo-logo.png",
}))

import { PreviewPreferencesProvider } from "~/features/preview/preferences/PreviewPreferencesContext"
import { createInitialPreviewPreferences } from "~/features/preview/preferences/previewPreferencesReducer"
import type { PreviewPreferencesState } from "~/features/preview/preferences/types"
import InvoicePreview from "./InvoicePreview"

const hooksMock = vi.hoisted(() => ({
  useEvent: vi.fn(),
  useMenuOfChargeItemsSection: vi.fn(),
  useFoodSection: vi.fn(),
  useBeverageSection: vi.fn(),
  usePaymentsSection: vi.fn(),
  usePrimaryClient: vi.fn(),
}))

vi.mock("~/hooks/useEvent", () => ({
  useEvent: hooksMock.useEvent,
}))

vi.mock("~/hooks/useMenuOfChargeSection", () => ({
  useMenuOfChargeItemsSection: hooksMock.useMenuOfChargeItemsSection,
}))

vi.mock("~/hooks/useFoodSection", () => ({
  useFoodSection: hooksMock.useFoodSection,
}))

vi.mock("~/hooks/useBeverageSection", () => ({
  useBeverageSection: hooksMock.useBeverageSection,
}))

vi.mock("~/hooks/usePaymentsSection", () => ({
  usePaymentsSection: hooksMock.usePaymentsSection,
}))

vi.mock("~/hooks/useEventContacts", () => ({
  usePrimaryClient: hooksMock.usePrimaryClient,
}))

function invoiceState(showPaymentStatus: boolean): PreviewPreferencesState {
  const state = createInitialPreviewPreferences()
  return {
    ...state,
    invoice: { ...state.invoice, showPaymentStatus },
    defaultsApplied: { ...state.defaultsApplied, invoicePayments: true },
  }
}

function renderInvoice(initialState: PreviewPreferencesState) {
  return render(
    <PreviewPreferencesProvider initialState={initialState}>
      <InvoicePreview />
    </PreviewPreferencesProvider>,
  )
}

function mockInvoiceEvent() {
  hooksMock.useEvent.mockReturnValue({
    data: { id: "event-1", startDateTime: "2026-06-01T16:00:00.000Z" },
  })
  hooksMock.usePrimaryClient.mockReturnValue({
    data: { contactId: "contact-1", displayName: "Alex Doe", phone: null, email: null },
  })
  hooksMock.useMenuOfChargeItemsSection.mockReturnValue({
    data: [{ id: "c1", category: "Venue", name: "Room", quantity: 2, unitPriceCents: 5000 }],
  })
  hooksMock.useFoodSection.mockReturnValue({
    data: [{ id: "f-tb", foodItems: [{ id: "f1", name: "Dinner", quantity: 2, unitPriceCents: 1000 }] }],
  })
  hooksMock.useBeverageSection.mockReturnValue({ items: [] })
  hooksMock.usePaymentsSection.mockReturnValue({
    data: [{ id: "p1", date: "2026-05-01T00:00:00.000Z", amountCents: 2500, notes: "", recieptNumber: "R-1" }],
  })
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("InvoicePreview", () => {
  it("prints the invoice title, every charge, the totals and the payments", async () => {
    mockInvoiceEvent()
    renderInvoice(invoiceState(true))

    await waitFor(() => {
      expect(screen.getByText("Event Invoice")).toBeTruthy()
    })

    expect(screen.getByText("Invoice Date")).toBeTruthy()
    expect(screen.getByText("Room")).toBeTruthy()
    expect(screen.getByText("Dinner")).toBeTruthy()
    // Charges 12000; HST 1560; gratuity on food 2000 × 0.18 = 360; grand 13920; balance 13920 − 2500
    expect(screen.getByText("Grand Total")).toBeTruthy()
    expect(screen.getAllByText("$139.20").length).toBeGreaterThan(0)
    // In the totals and as the payments table heading
    expect(screen.getAllByText("Payments Made")).toHaveLength(2)
    expect(screen.getByText("Balance Due")).toBeTruthy()
    expect(screen.getByText("$114.20")).toBeTruthy()
    expect(screen.getByText("R-1")).toBeTruthy()
  })

  it("leaves out the payment status and payments table when turned off", async () => {
    mockInvoiceEvent()
    renderInvoice(invoiceState(false))

    await waitFor(() => {
      expect(screen.getByText("Event Invoice")).toBeTruthy()
    })

    expect(screen.queryByText("Payments Made")).toBeNull()
    expect(screen.queryByText("Balance Due")).toBeNull()
    expect(screen.queryByText("R-1")).toBeNull()
  })

  it("bills a package × its final quantity and leaves out add-ons the client has not accepted", async () => {
    mockInvoiceEvent()
    hooksMock.useMenuOfChargeItemsSection.mockReturnValue({ data: [] })
    hooksMock.useFoodSection.mockReturnValue({
      data: [
        {
          id: "dinner",
          title: "Dinner",
          packagePricePerPersonCents: 4500,
          packageQuantity: 48,
          foodItems: [
            { id: "f1", name: "Buffet", quantity: 50, unitPriceCents: 3000, pricingBasis: "per_person" },
            { id: "f2", name: "Wings", quantity: 2, unitPriceCents: 10000, pricingBasis: "each" },
            { id: "f3", name: "Dessert station", quantity: 50, unitPriceCents: 800, pricingBasis: "per_person", isAddOn: true },
          ],
        },
      ],
    })
    renderInvoice(invoiceState(false))

    await waitFor(() => {
      expect(screen.getByText("Event Invoice")).toBeTruthy()
    })

    expect(screen.getByText("Dinner (package)")).toBeTruthy()
    expect(screen.getByText("$2,160.00")).toBeTruthy()
    expect(screen.getByText("Wings")).toBeTruthy()
    expect(screen.queryByText("Buffet")).toBeNull()
    expect(screen.queryByText("Dessert station")).toBeNull()
    // 236000 + HST 30680 + gratuity 42480
    expect(screen.getAllByText("$3,091.60").length).toBeGreaterThan(0)
  })
})
