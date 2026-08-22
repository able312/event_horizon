import { cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { renderWithProviders } from "~/test/renderWithProviders"

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

  it("renders type-grouped drink table and beverage timeblocks", () => {
    useBeverageSectionMock.mockReturnValue({
      timeblocks: [
        {
          id: "tb-1",
          eventId: "event-1",
          title: "Reception Bar",
          time: "16:00",
          sectionType: "beverage",
          assignedTo: "Bar Team",
          createdAt: "created",
          updatedAt: null,
          details: "Ice on the left",
        },
      ],
      items: [
        {
          id: "bev-1",
          eventId: "event-1",
          name: "House Red",
          quantity: 12,
          type: "Wine",
          serviceStyle: null,
          includes: null,
          unitPriceCents: 2200,
          assignedTimeblockIds: ["tb-1"],
        },
      ],
      isLoading: false,
      addTimeblock: vi.fn(),
      updateTimeblock: vi.fn(),
      removeTimeblock: vi.fn(),
      addItem: vi.fn(),
      updateItem: vi.fn(),
      removeItem: vi.fn(),
      setItemTimeblocks: vi.fn(),
    })

    renderWithProviders(<BeverageWorkspaceSection />)

    expect(screen.getByText("Beverage Planning")).toBeTruthy()
    expect(screen.getByText("Drinks")).toBeTruthy()
    expect(screen.getByRole("heading", { name: "Timeblocks", level: 4 })).toBeTruthy()
    expect(screen.getAllByText("Wine").length).toBeGreaterThan(0)
    expect(screen.getByDisplayValue("House Red")).toBeTruthy()
    expect(screen.getByDisplayValue("Reception Bar")).toBeTruthy()
    expect(screen.getByText("Ice on the left")).toBeTruthy()
    expect(screen.queryByText("Special Orders")).toBeNull()
    expect(screen.queryByLabelText("Service Style")).toBeNull()
    expect(screen.queryByText("$264.00")).toBeNull()
  })

  it("wires beverage mutations through the workspace actions", async () => {
    const addTimeblock = vi.fn()
    const updateTimeblock = vi.fn()
    const removeTimeblock = vi.fn()
    const addItem = vi.fn()
    const updateItem = vi.fn()
    const removeItem = vi.fn()
    const setItemTimeblocks = vi.fn()

    useBeverageSectionMock.mockReturnValue({
      timeblocks: [
        {
          id: "tb-1",
          eventId: "event-1",
          title: "Bar Service",
          time: "13:00",
          sectionType: "beverage",
          assignedTo: "",
          createdAt: "created",
          updatedAt: null,
          details: "",
        },
        {
          id: "tb-2",
          eventId: "event-1",
          title: "Dinner Bar",
          time: "18:00",
          sectionType: "beverage",
          assignedTo: "",
          createdAt: "created",
          updatedAt: null,
          details: "",
        },
      ],
      items: [
        {
          id: "bev-1",
          eventId: "event-1",
          name: "Sparkling Water",
          quantity: 10,
          type: "Non-Alcoholic",
          serviceStyle: null,
          includes: null,
          unitPriceCents: 300,
          assignedTimeblockIds: ["tb-1"],
        },
      ],
      isLoading: false,
      addTimeblock,
      updateTimeblock,
      removeTimeblock,
      addItem,
      updateItem,
      removeItem,
      setItemTimeblocks,
    })

    renderWithProviders(<BeverageWorkspaceSection />)

    fireEvent.change(screen.getAllByLabelText("Assigned To")[0], { target: { value: "Lead Bartender" } })
    fireEvent.blur(screen.getAllByLabelText("Assigned To")[0])
    expect(updateTimeblock).toHaveBeenCalledWith({
      id: "tb-1",
      updates: { assignedTo: "Lead Bartender" },
    })

    fireEvent.change(screen.getByLabelText("Beverage item name"), { target: { value: "Still Water" } })
    fireEvent.blur(screen.getByLabelText("Beverage item name"))
    expect(updateItem).toHaveBeenCalledWith({
      itemId: "bev-1",
      updates: { name: "Still Water" },
    })

    fireEvent.change(screen.getByLabelText("Beverage quantity"), { target: { value: "14" } })
    fireEvent.blur(screen.getByLabelText("Beverage quantity"))
    expect(updateItem).toHaveBeenCalledWith({
      itemId: "bev-1",
      updates: { quantity: 14 },
    })

    fireEvent.click(screen.getByRole("button", { name: /Add Item/i }))
    expect(addItem).toHaveBeenCalledWith({ type: "Beer", newItem: { name: "" } })

    fireEvent.click(screen.getByRole("button", { name: "Remove beverage item" }))
    expect(removeItem).toHaveBeenCalledWith({ itemId: "bev-1" })

    fireEvent.pointerDown(screen.getByRole("button", { name: "1 selected" }))
    fireEvent.click(await screen.findByRole("menuitemcheckbox", { name: "Dinner Bar" }))
    expect(setItemTimeblocks).toHaveBeenCalledWith({
      itemId: "bev-1",
      timeblockIds: ["tb-1", "tb-2"],
    })

    expect(screen.getAllByText("Notes...").length).toBeGreaterThan(0)
    fireEvent.click(screen.getAllByText("Notes...")[0])
    const notesField = screen.getByLabelText("Timeblock notes")
    fireEvent.change(notesField, { target: { value: "Chilled bottles" } })
    fireEvent.blur(notesField)
    expect(updateTimeblock).toHaveBeenCalledWith({
      id: "tb-1",
      updates: { details: "Chilled bottles" },
    })

    fireEvent.pointerDown(screen.getAllByRole("button", { name: "Timeblock header actions" })[0])
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete Timeblock" }))
    expect(removeTimeblock).toHaveBeenCalledWith("tb-1")

    fireEvent.click(screen.getByRole("button", { name: /^Add Timeblock$/i }))
    expect(addTimeblock).toHaveBeenCalled()
  })
})
