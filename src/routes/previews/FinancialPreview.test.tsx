import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("~/assets/Westlinks-SM-RGB.png", () => ({
  default: "/test-westlinks-logo.png",
}))

vi.mock("~/assets/SILO-SM-RGB.png", () => ({
  default: "/test-silo-logo.png",
}))

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

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("FinancialPreview", () => {
  it("renders combined menu/food/beverage totals using shared workspace model", () => {
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
      data: [{ id: "b-tb", beverageItems: [{ id: "b1", name: "Drinks", quantity: 1, unitPriceCents: 1500 }] }],
    })
    hooksMock.usePaymentsSection.mockReturnValue({
      data: [{ id: "p1", date: "2026-05-01T00:00:00.000Z", amountCents: 2500, notes: "", recieptNumber: "" }],
    })

    render(<FinancialPreview />)

    expect(screen.getByText("Event Estimate")).toBeTruthy()
    expect(screen.getByText("The Club at Westlinks")).toBeTruthy()
    expect(screen.getAllByText("$145.00").length).toBeGreaterThan(0)
    expect(screen.getByText("$18.85")).toBeTruthy()
    expect(screen.getAllByText("$163.85").length).toBeGreaterThan(0)
    expect(screen.getByText("$6.30")).toBeTruthy()
    expect(screen.getAllByText("$170.15").length).toBeGreaterThan(0)
    expect(screen.getAllByText("$25.00").length).toBeGreaterThan(0)
    expect(screen.getByText("$145.15")).toBeTruthy()

    expect(screen.queryByText("$14,500.00")).toBeNull()
  })
})
