import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { FoodOnlyPreview } from "./FoodOnlyPreview"

const hooksMock = vi.hoisted(() => ({
  useEvent: vi.fn(),
}))

vi.mock("~/hooks/useEvent", () => ({
  useEvent: hooksMock.useEvent,
}))

vi.mock("./sections/FoodDetails", () => ({
  FoodDetails: () => <div>Food details body</div>,
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe("FoodOnlyPreview", () => {
  it("renders an empty state when no event data exists", () => {
    hooksMock.useEvent.mockReturnValue({ data: undefined })

    render(<FoodOnlyPreview />)

    expect(screen.getByText("No event data found.")).toBeTruthy()
  })

  it("renders only the event overview header and food section", () => {
    hooksMock.useEvent.mockReturnValue({
      data: {
        id: "evt_1",
        title: "Spring Banquet",
        type: "social",
        status: "confirmed",
        minGuests: 40,
        maxGuests: 60,
        guestCountFinal: false,
        startDateTime: "2026-06-01T16:00:00.000Z",
        endDateTime: "2026-06-01T20:00:00.000Z",
        internalNotes: "Internal event note",
        clientName: "Alex Doe",
        clientPhone: "555-555-5555",
        clientEmail: "alex@example.com",
      },
    })

    render(<FoodOnlyPreview />)

    expect(screen.getByText("Event Overview")).toBeTruthy()
    expect(screen.getByText("Spring Banquet")).toBeTruthy()
    expect(screen.getByText("Food")).toBeTruthy()
    expect(screen.getByText("Food details body")).toBeTruthy()

    expect(screen.queryByText("Contact Information")).toBeNull()
    expect(screen.queryByText("Beverage")).toBeNull()
    expect(screen.queryByText("Setup Instructions")).toBeNull()
    expect(screen.queryByText("Vendor Details")).toBeNull()
    expect(screen.queryByText("Internal event note")).toBeTruthy()
    expect(screen.queryByText("Tournament Details")).toBeNull()
    expect(screen.queryByText("Cart Details")).toBeNull()
  })
})
