import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("~/assets/Westlinks-SM-RGB.png", () => ({
  default: "/test-westlinks-logo.png",
}))

vi.mock("~/assets/SILO-SM-RGB.png", () => ({
  default: "/test-silo-logo.png",
}))

import { PreviewPreferencesProvider } from "~/features/preview/preferences/PreviewPreferencesContext"
import type { FoodPackageEstimateMode } from "~/features/preview/lib/foodPackages"
import { createInitialPreviewPreferences } from "~/features/preview/preferences/previewPreferencesReducer"
import type { PreviewPreferencesState } from "~/features/preview/preferences/types"
import FinancialPreview from "./FinancialPreview"

const hooksMock = vi.hoisted(() => ({
  useEvent: vi.fn(),
  useMenuOfChargeItemsSection: vi.fn(),
  useFoodSection: vi.fn(),
  useBeverageSection: vi.fn(),
  usePrimaryClient: vi.fn(),
}))

vi.mock("~/hooks/useEvent", () => ({
  useEvent: hooksMock.useEvent,
}))

vi.mock("~/hooks/useMenuOfChargeSection", () => ({
  useMenuOfChargeItemsSection: hooksMock.useMenuOfChargeItemsSection,
}))

vi.mock("~/hooks/useFoodSection", () => ({
  useFoodSection: hooksMock.useFoodSection,
}))

vi.mock("~/hooks/useBeverageSection", () => ({
  useBeverageSection: hooksMock.useBeverageSection,
}))

vi.mock("~/hooks/useEventContacts", () => ({
  usePrimaryClient: hooksMock.usePrimaryClient,
}))

function renderFinancial(initialState?: PreviewPreferencesState) {
  return render(
    <PreviewPreferencesProvider initialState={initialState}>
      <FinancialPreview />
    </PreviewPreferencesProvider>,
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("FinancialPreview", () => {
  it("renders combined menu/food/beverage totals using shared workspace model", async () => {
    hooksMock.useEvent.mockReturnValue({
      data: {
        id: "event-1",
        startDateTime: "2026-06-01T16:00:00.000Z",
      },
    })
    hooksMock.usePrimaryClient.mockReturnValue({
      data: { contactId: "contact-1", displayName: "Alex Doe", phone: "555-555-5555", email: "alex@example.com" },
    })

    hooksMock.useMenuOfChargeItemsSection.mockReturnValue({
      data: [
        { id: "c1", category: "Venue", name: "Room", quantity: 2, unitPriceCents: 5000 },
        { id: "c2", category: "Golf", name: "Rounds", quantity: 1, unitPriceCents: 1000 },
      ],
    })

    hooksMock.useFoodSection.mockReturnValue({
      data: [{ id: "f-tb", foodItems: [{ id: "f1", name: "Dinner", quantity: 2, unitPriceCents: 1000 }] }],
    })
    hooksMock.useBeverageSection.mockReturnValue({
      items: [{ id: "b1", name: "Drinks", quantity: 1, unitPriceCents: 1500, type: "Beer", eventId: "event-1" }],
    })
    renderFinancial()

    await waitFor(() => {
      expect(screen.getByText("Event Estimate")).toBeTruthy()
    })

    expect(screen.getByText("The Club at Westlinks")).toBeTruthy()
    expect(screen.getByText("Alex Doe")).toBeTruthy()
    expect(screen.getByText("555-555-5555")).toBeTruthy()
    expect(screen.getByText("alex@example.com")).toBeTruthy()
    expect(screen.queryByText("Estimate Total")).toBeNull()
    expect(screen.queryByText("Charges Total")).toBeNull()
    expect(screen.getByText("Grand Total")).toBeTruthy()
    expect(screen.getAllByText("$170.15").length).toBeGreaterThan(0)
    expect(screen.queryByText("Payments Made")).toBeNull()
    expect(screen.queryByText("$14,500.00")).toBeNull()
  })

  it("does not render literal zero rows for incomplete food or beverage lines", async () => {
    hooksMock.useEvent.mockReturnValue({
      data: {
        id: "event-1",
        startDateTime: "2026-06-01T16:00:00.000Z",
      },
    })
    hooksMock.usePrimaryClient.mockReturnValue({ data: null })
    hooksMock.useMenuOfChargeItemsSection.mockReturnValue({ data: [] })
    hooksMock.useFoodSection.mockReturnValue({
      data: [
        {
          id: "f-tb",
          foodItems: [
            { id: "f1", name: "Dinner", quantity: 0, unitPriceCents: 1000 },
            { id: "f2", name: "Dessert", quantity: 2, unitPriceCents: null },
          ],
        },
      ],
    })
    hooksMock.useBeverageSection.mockReturnValue({
      items: [{ id: "b1", name: "Wine", quantity: null, unitPriceCents: 2500, type: "Wine", eventId: "e1" }],
    })

    renderFinancial()

    await waitFor(() => {
      expect(screen.getByText("Event Estimate")).toBeTruthy()
    })

    expect(screen.queryByText("Dinner")).toBeNull()
    expect(screen.queryByText("Dessert")).toBeNull()
    expect(screen.queryByText("Wine")).toBeNull()
  })

  describe("food packages", () => {
    function mockPackageEvent() {
      hooksMock.useEvent.mockReturnValue({
        data: { id: "event-1", startDateTime: "2026-06-01T16:00:00.000Z", minGuests: 10, maxGuests: 20 },
      })
      hooksMock.usePrimaryClient.mockReturnValue({ data: null })
      hooksMock.useMenuOfChargeItemsSection.mockReturnValue({ data: [] })
      hooksMock.useFoodSection.mockReturnValue({
        data: [
          { id: "lunch", title: "Lunch", foodItems: [{ id: "l1", name: "Sandwiches", quantity: 10, unitPriceCents: 1000 }] },
          { id: "pkg-a", title: "Option A", foodItems: [{ id: "a1", name: "Chicken", quantity: 20, unitPriceCents: 2000 }] },
          { id: "pkg-b", title: "Option B", foodItems: [{ id: "b1", name: "Steak", quantity: 20, unitPriceCents: 3000 }] },
        ],
      })
      hooksMock.useBeverageSection.mockReturnValue({ items: [] })
      }

    function packageState(mode: FoodPackageEstimateMode): PreviewPreferencesState {
      const state = createInitialPreviewPreferences()
      return {
        ...state,
        "financial-report": {
          ...state["financial-report"],
          showFoodPackages: true,
          foodPackageTimeblockIds: ["pkg-a", "pkg-b"],
          foodPackageEstimateMode: mode,
        },
        defaultsApplied: { ...state.defaultsApplied, financialFoodPackages: true },
      }
    }

    it("lists each package and shows the grand total as a range", async () => {
      mockPackageEvent()
      renderFinancial(packageState("list"))

      await waitFor(() => {
        expect(screen.getByText("Food Packages")).toBeTruthy()
      })

      expect(screen.getByText("Food package option: Option A")).toBeTruthy()
      expect(screen.getByText("Food package option: Option B")).toBeTruthy()
      // Lunch 10000 + A 40000 = 50000 -> 65500; with B 70000 -> 91700
      expect(screen.getByText("Grand Total (by package chosen)")).toBeTruthy()
      expect(screen.getByText("$655.00 – $917.00")).toBeTruthy()
      // Option A per person: 40000 / 20 = 2000 -> 2620; / 10 = 4000 -> 5240
      expect(screen.getByText("$26.20 – $52.40 per person")).toBeTruthy()
      expect(screen.getAllByText("Per person (10–20 guests)")).toHaveLength(2)
    })

    it("leaves packages out of the totals by default, with a pointer line", async () => {
      mockPackageEvent()
      renderFinancial(packageState("ignore"))

      await waitFor(() => {
        expect(screen.getByText("Food Packages")).toBeTruthy()
      })

      expect(screen.getByText("Food packages (2): priced separately, see Food Packages")).toBeTruthy()
      expect(screen.queryByText("Food package option: Option A")).toBeNull()
      expect(screen.getByText("Grand Total")).toBeTruthy()
      // Lunch only: 10000 + 1300 + 1800
      expect(screen.getAllByText("$131.00").length).toBeGreaterThan(0)
    })

    it("prints no packages page when food packages are off", async () => {
      mockPackageEvent()
      renderFinancial()

      await waitFor(() => {
        expect(screen.getByText("Event Estimate")).toBeTruthy()
      })

      expect(screen.queryByText("Food Packages")).toBeNull()
      // All three food timeblocks counted: 110000 -> 144100
      expect(screen.getAllByText("$1,441.00").length).toBeGreaterThan(0)
    })
  })
})
