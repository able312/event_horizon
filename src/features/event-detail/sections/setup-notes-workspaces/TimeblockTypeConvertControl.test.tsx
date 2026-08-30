import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import TimeblockTypeConvertControl from "./TimeblockTypeConvertControl"
import { SECTION_TYPE } from "~/definitions/timeblocks/timeblock-constants"

const inspectConversionMock = vi.fn()
const convertSectionTypeMock = vi.fn()

vi.mock("~/hooks/useTimeblockConversion", () => ({
  useTimeblockConversion: () => ({
    inspectConversion: inspectConversionMock,
    convertSectionType: convertSectionTypeMock,
    isInspecting: false,
    isConverting: false,
    isBusy: false,
  }),
}))

describe("TimeblockTypeConvertControl", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("converts immediately when the impact is non-destructive", async () => {
    inspectConversionMock.mockResolvedValue({
      requiresConfirmation: false,
      isDestructive: false,
      toType: SECTION_TYPE.SETUP_INSTRUCTION,
      summary: "Convert",
    })
    convertSectionTypeMock.mockResolvedValue({
      timeblock: { id: "tb-1", sectionType: SECTION_TYPE.SETUP_INSTRUCTION },
      impact: { requiresConfirmation: false },
    })

    render(
      <TimeblockTypeConvertControl
        eventId="event-1"
        timeblockId="tb-1"
        currentType={SECTION_TYPE.NOTE}
      />,
    )

    fireEvent.pointerDown(screen.getByRole("button", { name: "Convert timeblock type" }))
    fireEvent.click(screen.getByRole("button", { name: "Convert timeblock type" }))

    const destination = await screen.findByRole("menuitem", { name: "Convert to Setup Instruction" })
    fireEvent.click(destination)

    await waitFor(() => {
      expect(convertSectionTypeMock).toHaveBeenCalledWith({
        timeblockId: "tb-1",
        toType: SECTION_TYPE.SETUP_INSTRUCTION,
        confirmDestructive: false,
      })
    })
  })

  it("asks for confirmation before destructive food conversion", async () => {
    inspectConversionMock.mockResolvedValue({
      requiresConfirmation: true,
      isDestructive: true,
      toType: SECTION_TYPE.NOTE,
      summary:
        "Converting Dinner to a Note will permanently delete 2 food items, including quantities, prices, service styles, and item notes.",
      deletedItemCount: 2,
    })
    convertSectionTypeMock.mockResolvedValue({
      timeblock: { id: "tb-1", sectionType: SECTION_TYPE.NOTE },
      impact: { requiresConfirmation: true },
    })

    render(
      <TimeblockTypeConvertControl
        eventId="event-1"
        timeblockId="tb-1"
        currentType={SECTION_TYPE.FOOD}
      />,
    )

    fireEvent.pointerDown(screen.getByRole("button", { name: "Convert timeblock type" }))
    fireEvent.click(screen.getByRole("button", { name: "Convert timeblock type" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "Convert to Note" }))

    expect(
      await screen.findByText(
        "Converting Dinner to a Note will permanently delete 2 food items, including quantities, prices, service styles, and item notes.",
      ),
    ).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Convert and delete data" }))

    await waitFor(() => {
      expect(convertSectionTypeMock).toHaveBeenCalledWith({
        timeblockId: "tb-1",
        toType: SECTION_TYPE.NOTE,
        confirmDestructive: true,
      })
    })
  })

  it("asks for confirmation before removing beverage assignments", async () => {
    inspectConversionMock.mockResolvedValue({
      requiresConfirmation: true,
      isDestructive: true,
      toType: SECTION_TYPE.NOTE,
      summary:
        "Converting Cocktail Hour to a Note will remove 3 beverage assignments from this timeblock. The beverage menu items will remain available elsewhere in this event.",
      deletedItemCount: 0,
      removedAssignmentCount: 3,
    })
    convertSectionTypeMock.mockResolvedValue({
      timeblock: { id: "tb-bev", sectionType: SECTION_TYPE.NOTE },
      impact: { requiresConfirmation: true },
    })

    render(
      <TimeblockTypeConvertControl
        eventId="event-1"
        timeblockId="tb-bev"
        currentType={SECTION_TYPE.BEVERAGE}
      />,
    )

    fireEvent.pointerDown(screen.getByRole("button", { name: "Convert timeblock type" }))
    fireEvent.click(screen.getByRole("button", { name: "Convert timeblock type" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "Convert to Note" }))

    expect(
      await screen.findByText(
        "Converting Cocktail Hour to a Note will remove 3 beverage assignments from this timeblock. The beverage menu items will remain available elsewhere in this event.",
      ),
    ).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Convert and delete data" }))

    await waitFor(() => {
      expect(convertSectionTypeMock).toHaveBeenCalledWith({
        timeblockId: "tb-bev",
        toType: SECTION_TYPE.NOTE,
        confirmDestructive: true,
      })
    })
  })
})
