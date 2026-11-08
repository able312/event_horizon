import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { Event } from "~/definitions/database"
import FinancialWorkspaceSection from "./FinancialWorkspaceSection"

const hooksMock = vi.hoisted(() => ({
  useMenuOfChargeItemsSection: vi.fn(),
  useFoodSection: vi.fn(),
  useBeverageSection: vi.fn(),
}))
const menuPropsMock = vi.hoisted(() => vi.fn())


vi.mock("~/hooks/useMenuOfChargeSection", () => ({
  useMenuOfChargeItemsSection: hooksMock.useMenuOfChargeItemsSection,
}))

vi.mock("~/hooks/useFoodSection", () => ({
  useFoodSection: hooksMock.useFoodSection,
}))
vi.mock("~/hooks/useBeverageSection", () => ({
  useBeverageSection: hooksMock.useBeverageSection,
}))

vi.mock("~/features/event-detail/sections/financial-workspace/EstimateProposalSection", () => ({
  default: () => <div>Proposal Details</div>,
}))

vi.mock("~/features/event-detail/sections/financial-workspace/MenuOfChargeSection", () => ({
  default: (props: unknown) => {
    menuPropsMock(props)
    return <div>Menu Of Charges Table</div>
  },
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("FinancialWorkspaceSection", () => {
  it("renders all-source estimate totals and the billing editor", () => {
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

    const onSelectWorkspaceNode = vi.fn()
    render(
      <FinancialWorkspaceSection
        eventResource={{
          event: { id: "event-1", minGuests: 80, maxGuests: 120 } as Event,
          isLoading: false,
          updateEvent: vi.fn(),
          deleteEvent: vi.fn(),
        }}
        onSelectWorkspaceNode={onSelectWorkspaceNode}
      />,
    )

    expect(screen.getByText("Estimate Summary")).toBeTruthy()
    expect(screen.getByText("Quoting for 80–120 guests")).toBeTruthy()
    expect(screen.getByText("Menu Of Charges Table")).toBeTruthy()
    expect(screen.getByText("Menu Of Charges Table").parentElement?.className).toContain("min-w-0")
    // The charges come first; proposal details are mostly set once, so they sit below them
    expect(
      screen.getByText("Menu Of Charges Table").compareDocumentPosition(screen.getByText("Proposal Details")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()

    expect(screen.getByText("$145.00")).toBeTruthy()
    expect(screen.getByText("$6.30")).toBeTruthy()
    expect(screen.getByText("$18.85")).toBeTruthy()
    expect(screen.getByText("$170.15")).toBeTruthy()

    expect(screen.getByText("Subtotal")).toBeTruthy()
    expect(screen.getByText("Grand Total")).toBeTruthy()
    // Payments belong to the invoice section
    expect(screen.queryByText("Balance Remaining")).toBeNull()

    expect(menuPropsMock).toHaveBeenCalledWith(expect.objectContaining({ emptyStateMode: "workspace" }))
    expect(menuPropsMock).toHaveBeenCalledWith(expect.objectContaining({
      foodTimeblocks: [{ id: "f-tb", foodItems: [{ id: "f1", quantity: 2, unitPriceCents: 1000 }] }],
      beverageItems: [{ id: "b1", quantity: 1, unitPriceCents: 1500, type: "Beer", eventId: "event-1", name: "Beer" }],
      onNavigateToFood: expect.any(Function),
      onNavigateToBeverage: expect.any(Function),
      onUpdateFoodBillingItem: updateFoodItem,
      onUpdateBeverageBillingItem: expect.any(Function),
      guests: { min: 80, max: 120 },
    }))

    ;(menuPropsMock.mock.calls[0][0] as { onNavigateToFood: () => void }).onNavigateToFood()
    expect(onSelectWorkspaceNode).toHaveBeenCalledWith("category:food")
    ;(menuPropsMock.mock.calls[0][0] as { onNavigateToBeverage: () => void }).onNavigateToBeverage()
    expect(onSelectWorkspaceNode).toHaveBeenCalledWith("category:beverage")
  })
})
