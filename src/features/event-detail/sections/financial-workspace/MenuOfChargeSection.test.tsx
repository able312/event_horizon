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
    expect(screen.getAllByText(/These items are organized in planning\. Set how each is priced here/)).toHaveLength(2)
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
    const beveragePlanningTable = planningTables.find(
      (table) => within(table).queryByText("Wine") && !within(table).queryByText("Steak"),
    )
    expect(foodPlanningTable).toBeTruthy()
    expect(foodPlanningTable!.className).toContain("table-fixed")
    expect(beveragePlanningTable).toBeTruthy()
    expect(beveragePlanningTable!.className).toContain("table-fixed")
    expect(within(foodPlanningTable!).queryByTitle("Delete row")).toBeNull()
    expect(within(foodPlanningTable!).queryByPlaceholderText("Item name")).toBeNull()

    const foodCard = screen.getByText("Food").closest(".rounded-xs.border")
    const beverageCard = screen.getByText("Beverage").closest(".rounded-xs.border")
    expect(foodCard?.className).toContain("shadow-sm")
    expect(beverageCard?.className).toContain("shadow-sm")

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

  it("prices per-person lines against the guest count and saves the pricing choice", () => {
    const updateFoodBillingItem = vi.fn()
    hookMock.useMenuOfChargeItemsSection.mockReturnValue({
      data: [],
      createMenuOfChargeItemAsync: vi.fn(async () => ({ id: "new-id" })),
      updateMenuOfChargeItem: vi.fn(),
      deleteMenuOfChargeItemAsync: vi.fn(async () => true),
    })

    const foodTimeblocks = [
      {
        id: "food-tb-1",
        title: "Dinner",
        foodItems: [
          { id: "food-1", name: "Buffet", quantity: 0, unitPriceCents: 4500, pricingBasis: "per_person" },
          { id: "food-2", name: "Charcuterie board", quantity: 2, unitPriceCents: 15000, pricingBasis: "each" },
        ],
      } as never,
    ]

    const { rerender } = render(
      <MenuOfChargeSection
        foodTimeblocks={foodTimeblocks}
        guests={{ min: 80, max: 120 }}
        onUpdateFoodBillingItem={updateFoodBillingItem}
      />,
    )

    // 45.00 × 80–120 guests; the board is 2 × 150.00
    expect(screen.getByText("$3,600.00 – $5,400.00")).toBeTruthy()
    expect(screen.getByText("$300.00")).toBeTruthy()
    expect(screen.getByText("Food Subtotal: $3,900.00 – $5,700.00")).toBeTruthy()
    expect(screen.getByText("Charges Subtotal: $3,900.00 – $5,700.00")).toBeTruthy()

    fireEvent.change(screen.getAllByLabelText("Food Pricing")[1], { target: { value: "per_person" } })
    expect(updateFoodBillingItem).toHaveBeenCalledWith({
      timeblockId: "food-tb-1",
      itemId: "food-2",
      updates: { pricingBasis: "per_person" },
    })

    rerender(
      <MenuOfChargeSection
        foodTimeblocks={foodTimeblocks}
        guests={null}
        onUpdateFoodBillingItem={updateFoodBillingItem}
      />,
    )
    expect(screen.getByText("Needs guest count")).toBeTruthy()
    expect(screen.getByText("Food Subtotal: $300.00")).toBeTruthy()
  })

  it("leaves add-ons out of the subtotal and prices a timeblock by its package price", () => {
    const updateFoodBillingItem = vi.fn()
    const updateFoodBillingTimeblock = vi.fn()
    hookMock.useMenuOfChargeItemsSection.mockReturnValue({
      data: [],
      createMenuOfChargeItemAsync: vi.fn(async () => ({ id: "new-id" })),
      updateMenuOfChargeItem: vi.fn(),
      deleteMenuOfChargeItemAsync: vi.fn(async () => true),
    })

    const foodTimeblocks = [
      {
        id: "food-tb-1",
        title: "Dinner",
        packagePricePerPersonCents: 4500,
        foodItems: [
          { id: "food-1", name: "Buffet", quantity: 0, unitPriceCents: 3000, pricingBasis: "per_person" },
          { id: "food-2", name: "Wings platter", quantity: 2, unitPriceCents: 10000, pricingBasis: "each" },
          { id: "food-3", name: "Dessert station", quantity: 0, unitPriceCents: 800, pricingBasis: "per_person", isAddOn: true },
        ],
      } as never,
    ]

    render(
      <MenuOfChargeSection
        foodTimeblocks={foodTimeblocks}
        guests={{ min: 50, max: 50 }}
        onUpdateFoodBillingItem={updateFoodBillingItem}
        onUpdateFoodBillingTimeblock={updateFoodBillingTimeblock}
      />,
    )

    // $45 × 50 + 2 × $100; the buffet is covered and the dessert station is an add-on
    expect(screen.getByText("Food Subtotal: $2,450.00")).toBeTruthy()
    expect(screen.getByText("In package price")).toBeTruthy()
    // A per-person add-on under a package price would charge nothing extra once accepted: warn.
    expect(screen.getByText("Add-on, but the package price covers per-person items: price it Each to charge extra")).toBeTruthy()

    // The buffet is covered by the package price, so it can't be offered as a paid add-on.
    expect((screen.getAllByLabelText("Food Add-on")[0] as HTMLInputElement).disabled).toBe(true)

    fireEvent.click(screen.getAllByLabelText("Food Add-on")[1])
    expect(updateFoodBillingItem).toHaveBeenCalledWith({
      timeblockId: "food-tb-1",
      itemId: "food-2",
      updates: { isAddOn: true },
    })

    const packagePrice = screen.getByLabelText("Dinner Package price per person")
    // Unreadable text keeps the saved price instead of storing $0.
    fireEvent.change(packagePrice, { target: { value: "forty-five" } })
    fireEvent.blur(packagePrice)
    expect(updateFoodBillingTimeblock).not.toHaveBeenCalled()
    expect((packagePrice as HTMLInputElement).value).toBe("45.00")
    fireEvent.change(packagePrice, { target: { value: "$50" } })
    fireEvent.blur(packagePrice)
    expect(updateFoodBillingTimeblock).toHaveBeenCalledWith({
      timeblockId: "food-tb-1",
      updates: { packagePricePerPersonCents: 5000 },
    })
    fireEvent.change(packagePrice, { target: { value: "" } })
    fireEvent.blur(packagePrice)
    expect(updateFoodBillingTimeblock).toHaveBeenCalledWith({
      timeblockId: "food-tb-1",
      updates: { packagePricePerPersonCents: null },
    })

    fireEvent.click(screen.getByLabelText("Dinner Add-on"))
    expect(updateFoodBillingTimeblock).toHaveBeenCalledWith({ timeblockId: "food-tb-1", updates: { isAddOn: true } })
  })
})
