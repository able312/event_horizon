import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import BeverageWorkspaceSection from "./BeverageWorkspaceSection"

const useBeverageSectionMock = vi.fn()

vi.mock("~/hooks/useBeverageSection", () => ({
  useBeverageSection: () => useBeverageSectionMock(),
}))

describe("BeverageWorkspaceSection", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("renders compact beverage planning rows and subtotals", () => {
    useBeverageSectionMock.mockReturnValue({
      data: [
        {
          id: "tb-1",
          eventId: "event-1",
          title: "Reception Bar",
          time: "16:00",
          sectionType: "beverage",
          assignedTo: "Bar Team",
          createdAt: "created",
          updatedAt: null,
          beverageItems: [
            {
              id: "bev-1",
              timeblockId: "tb-1",
              name: "House Red",
              quantity: 12,
              type: null,
              serviceStyle: "Tray Passed",
              includes: "Cabernet",
              unitPriceCents: 2200,
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

    render(<BeverageWorkspaceSection />)

    expect(screen.getByText("Beverage Planning")).toBeTruthy()
    expect(screen.getByRole("table")).toBeTruthy()
    expect(screen.getByDisplayValue("House Red")).toBeTruthy()
    expect(screen.getByText("$264.00")).toBeTruthy()
    expect(screen.queryByText("Subtotal: $264.00")).toBeNull()
    expect(screen.getByText("Cabernet")).toBeTruthy()
  })

  it("wires beverage mutations through the workspace list actions", async () => {
    const addTimeblock = vi.fn()
    const updateTimeblock = vi.fn()
    const removeTimeblock = vi.fn()
    const addItem = vi.fn()
    const updateItem = vi.fn()
    const removeItem = vi.fn()

    useBeverageSectionMock.mockReturnValue({
      data: [
        {
          id: "tb-1",
          eventId: "event-1",
          title: "Bar Service",
          time: "13:00",
          sectionType: "beverage",
          assignedTo: "",
          createdAt: "created",
          updatedAt: null,
          beverageItems: [
            {
              id: "bev-1",
              timeblockId: "tb-1",
              name: "Sparkling Water",
              quantity: 10,
              type: null,
              serviceStyle: null,
              includes: null,
              unitPriceCents: 300,
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

    render(<BeverageWorkspaceSection />)

    fireEvent.change(screen.getByLabelText("Assigned To"), { target: { value: "Lead Bartender" } })
    fireEvent.blur(screen.getByLabelText("Assigned To"))
    expect(updateTimeblock).toHaveBeenCalledWith({
      id: "tb-1",
      updates: { assignedTo: "Lead Bartender" },
    })

    fireEvent.change(screen.getByLabelText("Item Name"), { target: { value: "Still Water" } })
    fireEvent.blur(screen.getByLabelText("Item Name"))
    expect(updateItem).toHaveBeenCalledWith({
      timeblockId: "tb-1",
      itemId: "bev-1",
      updates: { name: "Still Water" },
    })

    fireEvent.change(screen.getByLabelText("Service Style"), { target: { value: "Open Bar" } })
    fireEvent.blur(screen.getByLabelText("Service Style"))
    expect(updateItem).toHaveBeenCalledWith({
      timeblockId: "tb-1",
      itemId: "bev-1",
      updates: { serviceStyle: "Open Bar" },
    })

    expect(screen.getByText("Notes...")).toBeTruthy()
    fireEvent.click(screen.getByText("Notes..."))
    const notesField = screen.getByLabelText("Includes / Notes")
    fireEvent.change(notesField, { target: { value: "Chilled bottles" } })
    fireEvent.blur(notesField)
    expect(updateItem).toHaveBeenCalledWith({
      timeblockId: "tb-1",
      itemId: "bev-1",
      updates: { includes: "Chilled bottles" },
    })

    fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: "14" } })
    fireEvent.blur(screen.getByLabelText("Quantity"))
    expect(updateItem).toHaveBeenCalledWith({
      timeblockId: "tb-1",
      itemId: "bev-1",
      updates: { quantity: 14 },
    })

    fireEvent.change(screen.getByLabelText("Unit Price"), { target: { value: "4.50" } })
    fireEvent.blur(screen.getByLabelText("Unit Price"))
    expect(updateItem).toHaveBeenCalledWith({
      timeblockId: "tb-1",
      itemId: "bev-1",
      updates: { unitPriceCents: 450 },
    })

    fireEvent.click(screen.getByRole("button", { name: /Add Item/i }))
    expect(addItem).toHaveBeenCalledWith({ timeblockId: "tb-1", newItem: { name: "" } })

    fireEvent.click(screen.getByRole("button", { name: "Remove Item" }))
    expect(removeItem).toHaveBeenCalledWith({ timeblockId: "tb-1", itemId: "bev-1" })

    fireEvent.pointerDown(screen.getByRole("button", { name: "Calendar ID actions" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete Timeblock" }))
    expect(removeTimeblock).toHaveBeenCalledWith("tb-1")

    fireEvent.click(screen.getByRole("button", { name: /^Add Timeblock$/i }))
    expect(addTimeblock).toHaveBeenCalled()
  })
})
