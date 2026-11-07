import { cleanup, render, screen } from "@testing-library/react"
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
})
