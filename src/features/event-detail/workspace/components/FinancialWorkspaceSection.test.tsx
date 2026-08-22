import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import FinancialWorkspaceSection from "./FinancialWorkspaceSection"

const hooksMock = vi.hoisted(() => ({
  useMenuOfChargeItemsSection: vi.fn(),
  useFoodSection: vi.fn(),
  useBeverageSection: vi.fn(),
  usePaymentsSection: vi.fn(),
}))
const navigateMock = vi.hoisted(() => vi.fn())
const menuPropsMock = vi.hoisted(() => vi.fn())
const paymentsPropsMock = vi.hoisted(() => vi.fn())

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router")
  return {
    ...actual,
    useNavigate: () => navigateMock,
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

vi.mock("~/features/event-detail/sections/financial-workspace/MenuOfChargeSection", () => ({
  default: (props: unknown) => {
    menuPropsMock(props)
    return <div>Menu Of Charges Table</div>
  },
}))

vi.mock("~/features/event-detail/sections/financial-workspace/PaymentsSection", () => ({
  default: (props: unknown) => {
    paymentsPropsMock(props)
    return <button type="button" onClick={() => (props as { onGenerateEstimate: () => void }).onGenerateEstimate()}>Payments Table</button>
  },
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("FinancialWorkspaceSection", () => {
  it("renders simplified all-source summary values and billing editor container", () => {
    const updateFoodItem = vi.fn()
    const updateBeverageItem = vi.fn()

    hooksMock.useMenuOfChargeItemsSection.mockReturnValue({
      data: [
        { id: "c1", quantity: 2, unitPriceCents: 5000 },
        { id: "c2", quantity: 1, unitPriceCents: 1000 },
      ],
    })
    hooksMock.useFoodSection.mockReturnValue({
      data: [{ id: "f-tb", foodItems: [{ id: "f1", quantity: 2, unitPriceCents: 1000 }] }],
      updateItem: updateFoodItem,
    })
    hooksMock.useBeverageSection.mockReturnValue({
      items: [{ id: "b1", quantity: 1, unitPriceCents: 1500, type: "Beer", eventId: "event-1", name: "Beer" }],
      updateItem: updateBeverageItem,
    })

    hooksMock.usePaymentsSection.mockReturnValue({
      data: [{ id: "p1", amountCents: 2500 }],
    })

    const onSelectWorkspaceNode = vi.fn()
    render(<FinancialWorkspaceSection eventId="event-1" onSelectWorkspaceNode={onSelectWorkspaceNode} />)

    expect(screen.getByText("Financial Summary")).toBeTruthy()
    expect(screen.getByText("Menu Of Charges Table")).toBeTruthy()
    expect(screen.getByText("Payments Table")).toBeTruthy()

    const billingGrid = screen.getByText("Menu Of Charges Table").parentElement?.parentElement
    expect(billingGrid?.className).toContain("md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]")
    expect(screen.getByText("Menu Of Charges Table").parentElement?.className).toContain("min-w-0")
    expect(screen.getByText("Payments Table").parentElement?.className).toContain("min-w-0")

    expect(screen.getByText("$145.00")).toBeTruthy()
    expect(screen.getByText("$6.30")).toBeTruthy()
    expect(screen.getByText("$18.85")).toBeTruthy()
    expect(screen.getByText("$170.15")).toBeTruthy()
    expect(screen.getByText("$145.15")).toBeTruthy()

    expect(screen.getByText("Subtotal")).toBeTruthy()
    expect(screen.getByText("Grand Total")).toBeTruthy()
    expect(screen.getByText("Balance Remaining")).toBeTruthy()

    expect(menuPropsMock).toHaveBeenCalledWith(expect.objectContaining({ emptyStateMode: "workspace" }))
    expect(paymentsPropsMock).toHaveBeenCalledWith(expect.objectContaining({ emptyStateMode: "workspace" }))
    expect(menuPropsMock).toHaveBeenCalledWith(expect.objectContaining({
      foodTimeblocks: [{ id: "f-tb", foodItems: [{ id: "f1", quantity: 2, unitPriceCents: 1000 }] }],
      beverageItems: [{ id: "b1", quantity: 1, unitPriceCents: 1500, type: "Beer", eventId: "event-1", name: "Beer" }],
      onNavigateToFood: expect.any(Function),
      onNavigateToBeverage: expect.any(Function),
      onUpdateFoodBillingItem: updateFoodItem,
      onUpdateBeverageBillingItem: expect.any(Function),
    }))

    ;(menuPropsMock.mock.calls[0][0] as { onNavigateToFood: () => void }).onNavigateToFood()
    expect(onSelectWorkspaceNode).toHaveBeenCalledWith("category:food")
    ;(menuPropsMock.mock.calls[0][0] as { onNavigateToBeverage: () => void }).onNavigateToBeverage()
    expect(onSelectWorkspaceNode).toHaveBeenCalledWith("category:beverage")

    screen.getByRole("button", { name: "Payments Table" }).click()
    expect(navigateMock).toHaveBeenCalledWith("/preview/financial-report/event-1")
  })
})
