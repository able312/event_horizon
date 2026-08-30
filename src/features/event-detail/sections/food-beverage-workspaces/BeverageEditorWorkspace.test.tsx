import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { TimeblockWithItems } from "~/definitions/timeblocks/timeblocks-types"
import type { BeverageItemWithAssignments } from "~/definitions/beverage/beverage-types"
import BeverageEditorWorkspace from "./BeverageEditorWorkspace"

const updateTimeblockMock = vi.fn()
const removeTimeblockMock = vi.fn()
const addItemAssignedToTimeblockMock = vi.fn()
const updateItemMock = vi.fn()
const removeItemMock = vi.fn()
const setItemTimeblocksMock = vi.fn()
const refetchMock = vi.fn()

let mockItems: BeverageItemWithAssignments[] = []
let mockIsLoading = false
let mockIsError = false
let mockIsFetching = false

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router")
  return {
    ...actual,
    useParams: () => ({ id: "event-1" }),
  }
})

vi.mock("~/hooks/useBeverageSection", () => ({
  useBeverageSection: () => ({
    items: mockItems,
    isLoading: mockIsLoading,
    isError: mockIsError,
    isFetching: mockIsFetching,
    refetch: refetchMock,
    updateTimeblock: updateTimeblockMock,
    removeTimeblock: removeTimeblockMock,
    addItemAssignedToTimeblock: addItemAssignedToTimeblockMock,
    updateItem: updateItemMock,
    removeItem: removeItemMock,
    setItemTimeblocks: setItemTimeblocksMock,
    isMutating: false,
  }),
}))

vi.mock("~/features/event-detail/sections/setup-notes-workspaces/TimeblockTypeConvertControl", () => ({
  default: () => <div data-testid="type-convert-control" />,
}))

function makeTimeblock(overrides: Partial<TimeblockWithItems> = {}): TimeblockWithItems {
  return {
    id: "tb-bev",
    eventId: "event-1",
    title: "Cocktail Hour",
    time: "17:00",
    sectionType: "beverage",
    assignedTo: null,
    createdAt: "created",
    updatedAt: null,
    details: "Bar notes",
    beverageItems: [],
    ...overrides,
  }
}

function makeItem(
  overrides: Partial<BeverageItemWithAssignments> = {},
): BeverageItemWithAssignments {
  return {
    id: "bev-1",
    eventId: "event-1",
    name: "House Red",
    quantity: 10,
    type: "Wine",
    serviceStyle: "Open Bar",
    includes: "Chilled",
    unitPriceCents: 1400,
    assignedTimeblockIds: ["tb-bev"],
    ...overrides,
  }
}

describe("BeverageEditorWorkspace", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    mockItems = []
    mockIsLoading = false
    mockIsError = false
    mockIsFetching = false
  })

  it("renders healthy focused beverage editor with assignment checkbox", () => {
    mockItems = [
      makeItem(),
      makeItem({
        id: "bev-2",
        name: "Lager",
        type: "Beer",
        assignedTimeblockIds: [],
      }),
    ]

    render(
      <BeverageEditorWorkspace
        timeblock={makeTimeblock()}
        onDeleted={vi.fn()}
      />,
    )

    expect(screen.getByDisplayValue("Cocktail Hour")).toBeTruthy()
    expect(screen.getByDisplayValue("House Red")).toBeTruthy()
    expect(screen.getByDisplayValue("Lager")).toBeTruthy()
    expect(screen.getByTestId("type-convert-control")).toBeTruthy()

    const includeHouseRed = screen.getByRole("checkbox", {
      name: "Include House Red on this timeblock",
    }) as HTMLInputElement
    const includeLager = screen.getByRole("checkbox", {
      name: "Include Lager on this timeblock",
    }) as HTMLInputElement

    expect(includeHouseRed.checked).toBe(true)
    expect(includeLager.checked).toBe(false)
  })

  it("toggles assignment for the focused timeblock only", () => {
    mockItems = [makeItem({ assignedTimeblockIds: ["tb-bev", "tb-other"] })]

    render(
      <BeverageEditorWorkspace
        timeblock={makeTimeblock()}
        onDeleted={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole("checkbox", { name: "Include House Red on this timeblock" }))

    expect(setItemTimeblocksMock).toHaveBeenCalledWith({
      itemId: "bev-1",
      timeblockIds: ["tb-other"],
    })
  })

  it("hides item notes by default and toggles them with the info button", () => {
    mockItems = [makeItem({ includes: "Chilled" })]

    render(
      <BeverageEditorWorkspace
        timeblock={makeTimeblock()}
        onDeleted={vi.fn()}
      />,
    )

    expect(screen.queryByText("Chilled")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Show item notes" }))
    expect(screen.getByText("Chilled")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Hide item notes" }))
    expect(screen.queryByText("Chilled")).toBeNull()
  })

  it("creates a new item already assigned to the focused timeblock", () => {
    mockItems = []

    render(
      <BeverageEditorWorkspace
        timeblock={makeTimeblock()}
        onDeleted={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: /Add Item/i }))

    expect(addItemAssignedToTimeblockMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "Beer",
        timeblockId: "tb-bev",
        newItem: { name: "" },
      }),
    )
  })

  it("deletes exclusive items immediately and warns for shared assignments", async () => {
    mockItems = [
      makeItem({ id: "exclusive", name: "Exclusive", assignedTimeblockIds: ["tb-bev"] }),
      makeItem({
        id: "shared",
        name: "Shared Wine",
        assignedTimeblockIds: ["tb-bev", "tb-other"],
      }),
    ]

    render(
      <BeverageEditorWorkspace
        timeblock={makeTimeblock()}
        onDeleted={vi.fn()}
      />,
    )

    const removeButtons = screen.getAllByRole("button", { name: "Remove beverage item" })
    fireEvent.click(removeButtons[0]!)
    expect(removeItemMock).toHaveBeenCalledWith({ itemId: "exclusive" })

    fireEvent.click(removeButtons[1]!)
    expect(
      await screen.findByText(/also assigned to 1 other timeblock/),
    ).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Delete item" }))
    expect(removeItemMock).toHaveBeenCalledWith({ itemId: "shared" })
  })

  it("shows blocking error with retry when beverage section fails", async () => {
    mockIsError = true
    refetchMock.mockResolvedValue({})

    render(
      <BeverageEditorWorkspace
        timeblock={makeTimeblock()}
        onDeleted={vi.fn()}
      />,
    )

    expect(screen.getByText("Could not load beverage items")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Retry" }))

    await waitFor(() => {
      expect(refetchMock).toHaveBeenCalled()
    })
  })

  it("navigates away after deleting the timeblock", () => {
    const onDeleted = vi.fn()
    mockItems = []

    render(
      <BeverageEditorWorkspace
        timeblock={makeTimeblock()}
        onDeleted={onDeleted}
      />,
    )

    fireEvent.pointerDown(screen.getByRole("button", { name: "Timeblock header actions" }))
    fireEvent.click(screen.getByRole("button", { name: "Timeblock header actions" }))
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete Timeblock" }))

    expect(removeTimeblockMock).toHaveBeenCalledWith(
      "tb-bev",
      expect.objectContaining({
        onSuccess: expect.any(Function),
      }),
    )

    const options = removeTimeblockMock.mock.calls[0]?.[1] as { onSuccess?: () => void }
    options?.onSuccess?.()
    expect(onDeleted).toHaveBeenCalled()
  })
})
