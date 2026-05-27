import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import FoodWorkspaceSection from "./FoodWorkspaceSection"

const useFoodSectionMock = vi.fn()

vi.mock("~/hooks/useFoodSection", () => ({
  useFoodSection: () => useFoodSectionMock(),
}))

describe("FoodWorkspaceSection", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("renders compact planning rows and food pricing subtotals", () => {
    useFoodSectionMock.mockReturnValue({
      data: [
        {
          id: "tb-1",
          eventId: "event-1",
          title: "Dinner",
          time: "18:00",
          sectionType: "food",
          assignedTo: "Chef",
          createdAt: "created",
          updatedAt: null,
          foodItems: [
            {
              id: "food-1",
              timeblockId: "tb-1",
              name: "Prime Rib",
              quantity: 80,
              serviceStyle: "Plated",
              includes: "Horseradish",
              unitPriceCents: 3500,
            },
          ],
        },
      ],
      isLoading: false,
      addTimeblock: vi.fn(),
      updateTimeblock: vi.fn(),
      removeTimeblock: vi.fn(),
      addItem: vi.fn(),
      updateItem: vi.fn(),
      removeItem: vi.fn(),
    })

    render(<FoodWorkspaceSection />)

    expect(screen.getByText("Food Planning")).toBeTruthy()
    expect(screen.getByLabelText("Assigned To")).toBeTruthy()
    expect(screen.getByRole("table")).toBeTruthy()
    expect(screen.getByDisplayValue("Prime Rib")).toBeTruthy()
    expect(screen.getByText("$2,800.00")).toBeTruthy()
    expect(screen.queryByText("Subtotal: $2,800.00")).toBeNull()
    expect(screen.getByText("Horseradish")).toBeTruthy()
  })

  it("updates food workspace fields and routes actions through the hook mutations", async () => {
    const addTimeblock = vi.fn()
    const updateTimeblock = vi.fn()
    const removeTimeblock = vi.fn()
    const addItem = vi.fn()
    const updateItem = vi.fn()
    const removeItem = vi.fn()

    useFoodSectionMock.mockReturnValue({
      data: [
        {
          id: "tb-1",
          eventId: "event-1",
          title: "Cocktail Hour",
          time: "17:00",
          sectionType: "food",
          assignedTo: "",
          createdAt: "created",
          updatedAt: null,
          foodItems: [
            {
              id: "food-1",
              timeblockId: "tb-1",
              name: "Canapes",
              quantity: 20,
              serviceStyle: "Passed",
              includes: null,
              unitPriceCents: 250,
            },
            {
              id: "food-2",
              timeblockId: "tb-1",
              name: "Cheese Board",
              quantity: 1,
              serviceStyle: "Buffet",
              includes: "Baguette",
              unitPriceCents: 1800,
            },
          ],
        },
      ],
      isLoading: false,
      addTimeblock,
      updateTimeblock,
      removeTimeblock,
      addItem,
      updateItem,
      removeItem,
    })

    render(<FoodWorkspaceSection />)

    fireEvent.change(screen.getByLabelText("Assigned To"), { target: { value: "Kitchen Team" } })
    fireEvent.blur(screen.getByLabelText("Assigned To"))
    expect(updateTimeblock).toHaveBeenCalledWith({
      id: "tb-1",
      updates: { assignedTo: "Kitchen Team" },
    })

    const firstItemName = screen.getAllByLabelText("Item Name")[0]
    fireEvent.change(firstItemName, { target: { value: "Late Night Bites" } })
    fireEvent.blur(firstItemName)
    expect(updateItem).toHaveBeenCalledWith({
      timeblockId: "tb-1",
      itemId: "food-1",
      updates: { name: "Late Night Bites" },
    })

    const firstQuantity = screen.getAllByLabelText("Quantity")[0]
    fireEvent.change(firstQuantity, { target: { value: "24" } })
    fireEvent.blur(firstQuantity)
    expect(updateItem).toHaveBeenCalledWith({
      timeblockId: "tb-1",
      itemId: "food-1",
      updates: { quantity: 24 },
    })

    const firstUnitPrice = screen.getAllByLabelText("Unit Price")[0]
    fireEvent.change(firstUnitPrice, { target: { value: "3.75" } })
    fireEvent.blur(firstUnitPrice)
    expect(updateItem).toHaveBeenCalledWith({
      timeblockId: "tb-1",
      itemId: "food-1",
      updates: { unitPriceCents: 375 },
    })

    const firstRemoveItem = screen.getAllByRole("button", { name: "Remove Item" })[0]

    fireEvent.click(screen.getByRole("button", { name: /Add Item/i }))
    expect(addItem).toHaveBeenCalledWith({ timeblockId: "tb-1" })

    fireEvent.pointerDown(screen.getByRole("button", { name: "Calendar ID actions" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete Timeblock" }))
    expect(removeTimeblock).toHaveBeenCalledWith("tb-1")

    fireEvent.click(firstRemoveItem)
    expect(removeItem).toHaveBeenCalledWith({ timeblockId: "tb-1", itemId: "food-1" })

    fireEvent.click(screen.getByRole("button", { name: /^Add Timeblock$/i }))
    expect(addTimeblock).toHaveBeenCalled()
  })
})
