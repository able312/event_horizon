import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("~/assets/Westlinks-SM-RGB.png", () => ({
  default: "/test-westlinks-logo.png",
}))

vi.mock("~/assets/SILO-SM-RGB.png", () => ({
  default: "/test-silo-logo.png",
}))

import { PreviewPreferencesProvider } from "~/features/preview/preferences/PreviewPreferencesContext"
import FinancialPreview from "./FinancialPreview"

const hooksMock = vi.hoisted(() => ({
  useEvent: vi.fn(),
  useMenuOfChargeItemsSection: vi.fn(),
  useFoodSection: vi.fn(),
  useBeverageSection: vi.fn(),
  usePaymentsSection: vi.fn(),
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

function renderFinancial() {
  return render(
    <PreviewPreferencesProvider>
      <FinancialPreview />
    </PreviewPreferencesProvider>,
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("FinancialPreview", () => {
  it("renders combined menu/food/beverage totals using shared workspace model", async () => {
    hooksMock.useEvent.mockReturnValue({
      data: {
        clientName: "Alex Doe",
        clientPhone: "555-555-5555",
        clientEmail: "alex@example.com",
        startDateTime: "2026-06-01T16:00:00.000Z",
      },
    })

    hooksMock.useMenuOfChargeItemsSection.mockReturnValue({
      data: [
        { id: "c1", category: "Venue", name: "Room", quantity: 2, unitPriceCents: 5000 },
        { id: "c2", category: "Golf", name: "Rounds", quantity: 1, unitPriceCents: 1000 },
      ],
    })

    hooksMock.useFoodSection.mockReturnValue({
      data: [{ id: "f-tb", foodItems: [{ id: "f1", name: "Dinner", quantity: 2, unitPriceCents: 1000 }] }],
    })
    hooksMock.useBeverageSection.mockReturnValue({
      items: [{ id: "b1", name: "Drinks", quantity: 1, unitPriceCents: 1500, type: "Beer", eventId: "event-1" }],
    })
    hooksMock.usePaymentsSection.mockReturnValue({
      data: [{ id: "p1", date: "2026-05-01T00:00:00.000Z", amountCents: 2500, notes: "", recieptNumber: "" }],
    })

    renderFinancial()

    await waitFor(() => {
      expect(screen.getByText("Event Estimate")).toBeTruthy()
    })

    expect(screen.getByText("The Club at Westlinks")).toBeTruthy()
    expect(screen.queryByText("Estimate Total")).toBeNull()
    expect(screen.queryByText("Charges Total")).toBeNull()
    expect(screen.getByText("Grand Total")).toBeTruthy()
    expect(screen.getAllByText("$170.15").length).toBeGreaterThan(0)
    expect(screen.getByText("Payments Made")).toBeTruthy()
    expect(screen.queryByText("$14,500.00")).toBeNull()
  })

  it("does not render literal zero rows for incomplete food or beverage lines", async () => {
    hooksMock.useEvent.mockReturnValue({
      data: {
        clientName: "Alex Doe",
        startDateTime: "2026-06-01T16:00:00.000Z",
      },
    })
    hooksMock.useMenuOfChargeItemsSection.mockReturnValue({ data: [] })
    hooksMock.useFoodSection.mockReturnValue({
      data: [
        {
          id: "f-tb",
          foodItems: [
            { id: "f1", name: "Dinner", quantity: 0, unitPriceCents: 1000 },
            { id: "f2", name: "Dessert", quantity: 2, unitPriceCents: null },
          ],
        },
      ],
    })
    hooksMock.useBeverageSection.mockReturnValue({
      items: [{ id: "b1", name: "Wine", quantity: null, unitPriceCents: 2500, type: "Wine", eventId: "e1" }],
    })
    hooksMock.usePaymentsSection.mockReturnValue({ data: [] })

    renderFinancial()

    await waitFor(() => {
      expect(screen.getByText("Event Estimate")).toBeTruthy()
    })

    expect(screen.queryByText("Dinner")).toBeNull()
    expect(screen.queryByText("Dessert")).toBeNull()
    expect(screen.queryByText("Wine")).toBeNull()
  })
})
