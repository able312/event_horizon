import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import MenuOfChargeSection from "./MenuOfChargeSection"

const hookMock = vi.hoisted(() => ({
  useMenuOfChargeItemsSection: vi.fn(),
}))

vi.mock("~/hooks/useMenuOfChargeSection", () => ({
  useMenuOfChargeItemsSection: hookMock.useMenuOfChargeItemsSection,
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("MenuOfChargeSection", () => {
  it("renders unified manual and planning sections while preserving separate ownership", async () => {
    const updateMenuOfChargeItem = vi.fn()
    const updateFoodBillingItem = vi.fn()
    const updateBeverageBillingItem = vi.fn()
    const onNavigateToFood = vi.fn()

    hookMock.useMenuOfChargeItemsSection.mockReturnValue({
      data: [
        {
          id: "charge-1",
          name: "Hosted Bar Package",
          quantity: 2,
          unitPriceCents: 1250,
          category: "Food & Beverage",
          includes: "",
        },
      ],
      createMenuOfChargeItemAsync: vi.fn(async () => ({ id: "new-id" })),
      updateMenuOfChargeItem,
      deleteMenuOfChargeItemAsync: vi.fn(async () => true),
    })

    render(
      <MenuOfChargeSection
        foodTimeblocks={[
          {
            id: "food-tb-1",
            title: "Dinner",
            foodItems: [{ id: "food-1", name: "Steak", quantity: 2, unitPriceCents: 1250 }],
          } as never,
          {
            id: "food-tb-2",
            title: "Late Night",
            foodItems: [],
          } as never,
        ]}
        beverageItems={[
          { id: "bev-1", name: "Wine", quantity: 1, unitPriceCents: 900, type: "Wine", eventId: "event-1" } as never,
        ]}
        onNavigateToFood={onNavigateToFood}
        onUpdateFoodBillingItem={updateFoodBillingItem}
        onUpdateBeverageBillingItem={updateBeverageBillingItem}
      />,
    )

    expect(screen.getAllByText("Food & Beverage")[0]).toBeTruthy()
    expect(screen.getByText("Food")).toBeTruthy()
    expect(screen.getByText("Beverage")).toBeTruthy()
    expect(screen.getAllByText("From Planning")).toHaveLength(2)
    expect(screen.getAllByText("These items are organized in planning. Adjust qty and pricing here.")).toHaveLength(2)
    expect(screen.getByText("Dinner")).toBeTruthy()
    expect(screen.getAllByText("Wine").length).toBeGreaterThan(0)

    const planningRow = screen.getByText("Steak").closest("tr")
    expect(planningRow?.getAttribute("draggable")).toBeNull()

    const foodQtyInputs = screen.getAllByLabelText("Food Quantity")
    fireEvent.change(foodQtyInputs[0], { target: { value: "4" } })
    fireEvent.blur(foodQtyInputs[0])
    expect(updateFoodBillingItem).toHaveBeenCalledWith({
      timeblockId: "food-tb-1",
      itemId: "food-1",
      updates: { quantity: 4 },
    })

    const beveragePriceInput = screen.getByLabelText("Beverage Unit Price")
    fireEvent.change(beveragePriceInput, { target: { value: "13.37" } })
    fireEvent.blur(beveragePriceInput)
    expect(updateBeverageBillingItem).toHaveBeenCalledWith({
      itemId: "bev-1",
      updates: { unitPriceCents: 1337 },
    })

    const manualQtyInput = screen.getByDisplayValue("2")
    expect(manualQtyInput.closest("td")?.className).toContain("text-right")
    expect(manualQtyInput.className).toContain("ml-auto")
    expect(manualQtyInput.className).toContain("text-right")

    const manualUnitPriceInput = screen.getAllByDisplayValue("12.50")[0]
    expect(manualUnitPriceInput.closest("td")?.className).toContain("text-right")
    expect(manualUnitPriceInput.className).toContain("ml-auto")
    expect(manualUnitPriceInput.className).toContain("text-right")

    const planningQtyInput = screen.getAllByLabelText("Food Quantity")[0]
    expect(planningQtyInput.closest("td")?.className).toContain("text-right")
    expect(planningQtyInput.className).toContain("ml-auto")
    expect(planningQtyInput.className).toContain("text-right")

    const planningUnitPriceInput = screen.getByLabelText("Food Unit Price")
    expect(planningUnitPriceInput.closest("td")?.className).toContain("text-right")
    expect(planningUnitPriceInput.className).toContain("ml-auto")
    expect(planningUnitPriceInput.className).toContain("text-right")

    fireEvent.click(screen.getByRole("button", { name: "Start planning" }))
    expect(onNavigateToFood).toHaveBeenCalledTimes(1)

    const planningTables = screen.getAllByRole("table")
    const foodPlanningTable = planningTables.find((table) => within(table).queryByText("Steak"))
    expect(foodPlanningTable).toBeTruthy()
    expect(within(foodPlanningTable!).queryByTitle("Delete row")).toBeNull()
    expect(within(foodPlanningTable!).queryByPlaceholderText("Item name")).toBeNull()

    expect(screen.getByText("Charges Subtotal: $59.00")).toBeTruthy()
  })

  it("renders workspace empty state alongside planning-owned empty states", async () => {
    const createMenuOfChargeItemAsync = vi.fn(async () => ({ id: "new-id" }))
    const onNavigateToFood = vi.fn()
    const onNavigateToBeverage = vi.fn()

    hookMock.useMenuOfChargeItemsSection.mockReturnValue({
      data: [],
      createMenuOfChargeItemAsync,
      updateMenuOfChargeItem: vi.fn(),
      deleteMenuOfChargeItemAsync: vi.fn(async () => true),
    })

    render(
      <MenuOfChargeSection
        emptyStateMode="workspace"
        onNavigateToFood={onNavigateToFood}
        onNavigateToBeverage={onNavigateToBeverage}
      />,
    )

    expect(screen.getByText("No charge items yet.")).toBeTruthy()
    expect(screen.getByText("No food timeblocks from planning yet.")).toBeTruthy()
    expect(screen.getByText("No beverage items from planning yet.")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Add First Charge Item" }))

    await waitFor(() => {
      expect(createMenuOfChargeItemAsync).toHaveBeenCalledTimes(1)
    })

    fireEvent.click(screen.getAllByRole("button", { name: "Start planning" })[0])
    expect(onNavigateToFood).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getAllByRole("button", { name: "Start planning" })[1])
    expect(onNavigateToBeverage).toHaveBeenCalledTimes(1)
  })
})
