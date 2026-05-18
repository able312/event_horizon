import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import FoodSection from "./FoodSection"

const useFoodSectionMock = vi.fn()

vi.mock("~/hooks/useFoodSection", () => ({
  useFoodSection: () => useFoodSectionMock(),
}))

describe("FoodSection", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("renders menu timeblocks and empty-state actions", () => {
    useFoodSectionMock.mockReturnValue({
      data: [
        {
          id: "tb-1",
          eventId: "event-1",
          title: "Dinner",
          time: "18:00",
          sectionType: "food",
          assignedTo: null,
          createdAt: "created",
          updatedAt: null,
          foodItems: [],
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

    render(<FoodSection />)

    expect(screen.getByText("Menu Timeblocks")).toBeTruthy()
    expect(screen.getByText("No menu items have been added to this timeblock.")).toBeTruthy()
    expect(screen.getByRole("button", { name: /Add Item/i })).toBeTruthy()
  })

  it("updates food item values and routes add/remove actions through the hook", () => {
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
          assignedTo: null,
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
              unitPriceCents: null,
            },
            {
              id: "food-2",
              timeblockId: "tb-1",
              name: "Stationed Cheese",
              quantity: 1,
              serviceStyle: "Buffet",
              includes: "Baguette",
              unitPriceCents: null,
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

    render(<FoodSection />)

    const assignedToInput = screen.getByPlaceholderText("Assign to...")
    fireEvent.change(assignedToInput, { target: { value: "Kitchen Team" } })
    fireEvent.blur(assignedToInput)

    expect(updateTimeblock).toHaveBeenCalledWith({
      id: "tb-1",
      updates: { assignedTo: "Kitchen Team" },
    })

    const quantityInputs = screen.getAllByPlaceholderText("0")
    fireEvent.change(quantityInputs[0], { target: { value: "24" } })
    fireEvent.blur(quantityInputs[0])
    expect(updateItem).toHaveBeenCalledWith({
      timeblockId: "tb-1",
      itemId: "food-1",
      updates: { quantity: 24 },
    })

    fireEvent.click(screen.getAllByRole("button")[1])
    expect(removeItem).toHaveBeenCalledWith({
      timeblockId: "tb-1",
      itemId: "food-1",
    })

    fireEvent.click(screen.getByRole("button", { name: /Add Item/i }))
    expect(addItem).toHaveBeenCalledWith({ timeblockId: "tb-1" })

    fireEvent.click(screen.getByRole("button", { name: /Add Timeblock/i }))
    expect(addTimeblock).toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: /Remove/i }))
    expect(removeTimeblock).toHaveBeenCalledWith("tb-1")

    expect(updateItem).not.toHaveBeenCalledWith({
      timeblockId: "tb-1",
      itemId: "food-2",
      updates: { quantity: 24 },
    })
  })
})
