import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import InvoiceWorkspaceSection from "./InvoiceWorkspaceSection"

const hooksMock = vi.hoisted(() => ({
  useMenuOfChargeItemsSection: vi.fn(),
  useFoodSection: vi.fn(),
  useBeverageSection: vi.fn(),
  usePaymentsSection: vi.fn(),
}))
const navigateMock = vi.hoisted(() => vi.fn())

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router")
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useLocation: () => ({ pathname: "/events/event-1/invoice", search: "", hash: "" }),
  }
})

vi.mock("~/hooks/useMenuOfChargeSection", () => ({
  useMenuOfChargeItemsSection: hooksMock.useMenuOfChargeItemsSection,
}))
vi.mock("~/hooks/usePaymentsSection", () => ({
  usePaymentsSection: hooksMock.usePaymentsSection,
}))
vi.mock("~/hooks/useFoodSection", () => ({
  useFoodSection: hooksMock.useFoodSection,
}))
vi.mock("~/hooks/useBeverageSection", () => ({
  useBeverageSection: hooksMock.useBeverageSection,
}))
vi.mock("~/features/event-detail/sections/financial-workspace/PaymentsSection", () => ({
  default: () => <div>Payments Table</div>,
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("InvoiceWorkspaceSection", () => {
  it("shows the balance after payments, the payments editor and the invoice link", () => {
    hooksMock.useMenuOfChargeItemsSection.mockReturnValue({
      data: [{ id: "c1", quantity: 2, unitPriceCents: 5000 }],
    })
    hooksMock.useFoodSection.mockReturnValue({
      data: [{ id: "f-tb", foodItems: [{ id: "f1", quantity: 2, unitPriceCents: 1000 }] }],
    })
    hooksMock.useBeverageSection.mockReturnValue({ items: [] })
    hooksMock.usePaymentsSection.mockReturnValue({
      data: [{ id: "p1", amountCents: 2500 }],
    })

    render(<InvoiceWorkspaceSection eventId="event-1" />)

    // Charges 12000; HST 1560; gratuity on food 360; grand 13920; paid 2500; balance 11420
    expect(screen.getByText("$139.20")).toBeTruthy()
    expect(screen.getByText("$25.00")).toBeTruthy()
    expect(screen.getByText("$114.20")).toBeTruthy()
    expect(screen.getByText("Payments Table")).toBeTruthy()

    screen.getByRole("button", { name: "Generate Invoice" }).click()
    expect(navigateMock).toHaveBeenCalledWith("/preview/event-1?type=invoice&returnTo=%2Fevents%2Fevent-1%2Finvoice")
  })

  it("bills a package price × its final quantity and asks for the quantity until it is set", () => {
    const updateTimeblock = vi.fn()
    const dinner = {
      id: "dinner",
      title: "Dinner",
      packagePricePerPersonCents: 4500,
      packageQuantity: null,
      foodItems: [
        { id: "f1", name: "Buffet", quantity: 50, unitPriceCents: 3000, pricingBasis: "per_person" },
        { id: "f2", name: "Wings", quantity: 2, unitPriceCents: 10000, pricingBasis: "each" },
      ],
    }
    hooksMock.useMenuOfChargeItemsSection.mockReturnValue({ data: [] })
    hooksMock.useFoodSection.mockReturnValue({ data: [dinner], updateTimeblock })
    hooksMock.useBeverageSection.mockReturnValue({ items: [] })
    hooksMock.usePaymentsSection.mockReturnValue({ data: [] })

    const { rerender } = render(<InvoiceWorkspaceSection eventId="event-1" />)

    // Only the wings until the quantity is set: 20000 + HST 2600 + gratuity 3600
    expect(screen.getByRole("alert").textContent).toContain("Needs a final quantity before invoicing: Dinner")
    expect(screen.getAllByText("$262.00").length).toBeGreaterThan(0)

    const input = screen.getByLabelText("Dinner Final quantity")
    fireEvent.change(input, { target: { value: "48" } })
    fireEvent.blur(input)
    expect(updateTimeblock).toHaveBeenCalledWith({ id: "dinner", updates: { packageQuantity: 48 } })

    hooksMock.useFoodSection.mockReturnValue({ data: [{ ...dinner, packageQuantity: 48 }], updateTimeblock })
    rerender(<InvoiceWorkspaceSection eventId="event-1" />)
    // 4500 × 48 = 216000 + 20000 = 236000; HST 30680; gratuity 42480; grand 309160
    expect(screen.queryByRole("alert")).toBeNull()
    expect(screen.getByText("$2,160.00")).toBeTruthy()
    expect(screen.getAllByText("$3,091.60").length).toBeGreaterThan(0)
  })
})
