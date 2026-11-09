import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

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
  useEstimateDetailsSection: vi.fn(),
  useVenueSettings: vi.fn(),
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

vi.mock("~/hooks/useEstimateDetailsSection", () => ({
  useEstimateDetailsSection: hooksMock.useEstimateDetailsSection,
}))

vi.mock("~/hooks/useVenueSettings", () => ({
  useVenueSettings: hooksMock.useVenueSettings,
}))

const NO_PROPOSAL_DETAILS = {
  id: "details-1",
  eventId: "event-1",
  introNote: null,
  validUntil: null,
  terms: null,
  depositKind: "none",
  depositAmountCents: null,
  depositPercent: null,
  depositDueDate: null,
  depositNote: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: null,
}

beforeEach(() => {
  hooksMock.useEstimateDetailsSection.mockReturnValue({ data: NO_PROPOSAL_DETAILS })
  hooksMock.useVenueSettings.mockReturnValue({ data: null })
})

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

  describe("per-person pricing", () => {
    function mockPerPersonEvent(guests: { minGuests: number | null; maxGuests: number | null }) {
      hooksMock.useEvent.mockReturnValue({
        data: { id: "event-1", startDateTime: "2026-06-01T16:00:00.000Z", ...guests },
      })
      hooksMock.usePrimaryClient.mockReturnValue({ data: null })
      hooksMock.useMenuOfChargeItemsSection.mockReturnValue({ data: [] })
      hooksMock.useFoodSection.mockReturnValue({
        data: [
          {
            id: "dinner",
            title: "Dinner",
            foodItems: [
              { id: "d1", name: "Buffet", quantity: null, unitPriceCents: 4500, pricingBasis: "per_person" },
              { id: "d2", name: "Cake", quantity: 1, unitPriceCents: 10000, pricingBasis: "each" },
            ],
          },
        ],
      })
      hooksMock.useBeverageSection.mockReturnValue({ items: [] })
    }

    it("prices per-person lines by the guest range and ranges the totals", async () => {
      mockPerPersonEvent({ minGuests: 80, maxGuests: 120 })
      renderFinancial()

      await waitFor(() => {
        expect(screen.getByText("Event Estimate")).toBeTruthy()
      })

      expect(screen.getByText("Buffet")).toBeTruthy()
      expect(screen.getByText("$45.00")).toBeTruthy()
      expect(screen.getByText("80–120 guests")).toBeTruthy()
      expect(screen.getByText("Priced per person")).toBeTruthy()
      expect(screen.getByText("$3,600.00 – $5,400.00")).toBeTruthy()
      // 370000 -> 370000 + 48100 + 66600 = 484700; 550000 -> 550000 + 71500 + 99000 = 720500
      expect(screen.getByText("Grand Total (by guest count)")).toBeTruthy()
      expect(screen.getByText("$4,847.00 – $7,205.00")).toBeTruthy()
    })

    it("prints a package price as one per-person line and counts add-ons in the high end only", async () => {
      mockPerPersonEvent({ minGuests: 50, maxGuests: 50 })
      hooksMock.useFoodSection.mockReturnValue({
        data: [
          {
            id: "dinner",
            title: "Dinner",
            packagePricePerPersonCents: 4500,
            foodItems: [
              { id: "d1", name: "Buffet", quantity: null, unitPriceCents: 3000, pricingBasis: "per_person" },
              { id: "d2", name: "Wings platter", quantity: 2, unitPriceCents: 10000, pricingBasis: "each" },
              { id: "d3", name: "Dessert station", quantity: null, unitPriceCents: 800, pricingBasis: "per_person", isAddOn: true },
            ],
          },
        ],
      })
      hooksMock.useBeverageSection.mockReturnValue({
        items: [{ id: "b1", name: "Bar upgrade", type: "Rails", quantity: null, unitPriceCents: 1200, pricingBasis: "per_person", isAddOn: true }],
      })
      renderFinancial()

      await waitFor(() => {
        expect(screen.getByText("Event Estimate")).toBeTruthy()
      })
      // Dinner at $45 × 50 = $2,250 plus the platters' $200; the buffet's own price is not used.
      expect(screen.getByText("$45.00")).toBeTruthy()
      expect(screen.getByText("50 guests")).toBeTruthy()
      expect(screen.getByText("$2,250.00")).toBeTruthy()
      expect(screen.queryByText("Buffet")).toBeNull()
      expect(screen.getByText("Wings platter")).toBeTruthy()
      // Add-ons print in their own table, priced, and count only toward the high end.
      expect(screen.getByText("Optional Add-ons")).toBeTruthy()
      expect(screen.getByText("Dessert station")).toBeTruthy()
      expect(screen.getByText("$8.00 per person")).toBeTruthy()
      expect(screen.getByText("$400.00")).toBeTruthy()
      expect(screen.getByText("Bar upgrade")).toBeTruthy()
      expect(screen.getByText("$600.00")).toBeTruthy()
      // Low: 245000 subtotal, HST 31850, gratuity 44100 = 320950.
      // High: + add-ons 40000 + 60000 = 345000, HST 44850, gratuity 62100 = 451950.
      expect(screen.getByText("Grand Total (by add-ons)")).toBeTruthy()
      expect(screen.getByText("$3,209.50 – $4,519.50")).toBeTruthy()
    })

    it("prints the proposal details, with a percentage deposit that follows the total range", async () => {
      mockPerPersonEvent({ minGuests: 80, maxGuests: 120 })
      hooksMock.useEstimateDetailsSection.mockReturnValue({
        data: {
          ...NO_PROPOSAL_DETAILS,
          introNote: "Thank you for considering us.",
          validUntil: "2026-12-01",
          depositKind: "percent",
          depositPercent: 25,
          depositDueDate: "2026-12-15",
          depositNote: "Non-refundable.",
        },
      })
      hooksMock.useVenueSettings.mockReturnValue({
        data: { id: "venue", defaultEstimateTerms: "Payment due in full.\n\nNo outside food.", createdAt: "", updatedAt: null },
      })
      renderFinancial()

      await waitFor(() => {
        expect(screen.getByText("Event Estimate")).toBeTruthy()
      })
      expect(screen.getByText("Thank you for considering us.")).toBeTruthy()
      expect(screen.getByText("Valid Until")).toBeTruthy()
      expect(screen.getByText("Dec 1, 2026")).toBeTruthy()
      expect(screen.getByText("25% of the grand total: $1,211.75 – $1,801.25")).toBeTruthy()
      expect(screen.getByText("Dec 15, 2026")).toBeTruthy()
      expect(screen.getByText("Non-refundable.")).toBeTruthy()
      expect(screen.getByText("Terms")).toBeTruthy()
      expect(screen.getByText("Payment due in full.")).toBeTruthy()
      expect(screen.getByText("No outside food.")).toBeTruthy()
    })

    it("prints the event's own terms over the venue default, and no deposit by default", async () => {
      mockPerPersonEvent({ minGuests: 80, maxGuests: 120 })
      hooksMock.useEstimateDetailsSection.mockReturnValue({ data: { ...NO_PROPOSAL_DETAILS, terms: "Event terms." } })
      hooksMock.useVenueSettings.mockReturnValue({
        data: { id: "venue", defaultEstimateTerms: "Venue terms.", createdAt: "", updatedAt: null },
      })
      renderFinancial()

      await waitFor(() => {
        expect(screen.getByText("Event Estimate")).toBeTruthy()
      })
      expect(screen.getByText("Event terms.")).toBeTruthy()
      expect(screen.queryByText("Venue terms.")).toBeNull()
      expect(screen.queryByText("Deposit")).toBeNull()
      expect(screen.queryByText("Valid Until")).toBeNull()
    })

    it("shows a per-person line without a dollar total, and leaves it out, when there is no guest count", async () => {
      mockPerPersonEvent({ minGuests: null, maxGuests: null })
      renderFinancial()

      await waitFor(() => {
        expect(screen.getByText("Event Estimate")).toBeTruthy()
      })

      expect(screen.getByText("Buffet")).toBeTruthy()
      expect(screen.getByText("per person")).toBeTruthy()
      expect(screen.getByText("Grand Total")).toBeTruthy()
      // Cake only: 10000 + 1300 + 1800
      expect(screen.getAllByText("$131.00").length).toBeGreaterThan(0)
    })
  })

  describe("pricing views", () => {
    function withPricing(showTotalPricing: boolean, showPerPersonPricing: boolean): PreviewPreferencesState {
      const state = createInitialPreviewPreferences()
      return {
        ...state,
        "financial-report": { ...state["financial-report"], showTotalPricing, showPerPersonPricing },
      }
    }

    function mockBuffetEvent(guests: { minGuests: number | null; maxGuests: number | null }) {
      hooksMock.useEvent.mockReturnValue({ data: { id: "event-1", startDateTime: "2026-06-01T16:00:00.000Z", ...guests } })
      hooksMock.usePrimaryClient.mockReturnValue({ data: null })
      hooksMock.useMenuOfChargeItemsSection.mockReturnValue({ data: [] })
      hooksMock.useFoodSection.mockReturnValue({
        data: [
          {
            id: "dinner",
            title: "Dinner",
            foodItems: [
              { id: "d1", name: "Buffet", quantity: null, unitPriceCents: 4500, pricingBasis: "per_person" },
              { id: "d2", name: "Cake", quantity: 1, unitPriceCents: 10000, pricingBasis: "each" },
            ],
          },
        ],
      })
      hooksMock.useBeverageSection.mockReturnValue({ items: [] })
    }

    it("prints the event total and the per-person breakdown as two sections", async () => {
      mockBuffetEvent({ minGuests: 80, maxGuests: 120 })
      renderFinancial(withPricing(true, true))

      await waitFor(() => {
        expect(screen.getByText("Event Estimate")).toBeTruthy()
      })

      expect(screen.getByRole("heading", { name: "Event Total", hidden: true })).toBeTruthy()
      expect(screen.getByRole("heading", { name: "Per Person", hidden: true })).toBeTruthy()
      expect(screen.getByText("$4,847.00 – $7,205.00")).toBeTruthy()
      // The cake's $100 shared by 120 guests ($0.83) up to 80 ($1.25).
      expect(screen.getByText("$100.00 shared by 80–120 guests")).toBeTruthy()
      expect(screen.getByText("$0.83 – $1.25")).toBeTruthy()
      // At 120: 550000 / 120 = 4583, HST 596, gratuity 825 = 6004.
      // At 80: 370000 / 80 = 4625, HST 601, gratuity 833 = 6059.
      expect(screen.getByText("Per Person Total (by guest count)")).toBeTruthy()
      expect(screen.getByText("$60.04 – $60.59")).toBeTruthy()
    })

    it("prints only the per-person section when the total is off", async () => {
      mockBuffetEvent({ minGuests: 80, maxGuests: 120 })
      renderFinancial(withPricing(false, true))

      await waitFor(() => {
        expect(screen.getByText("Event Estimate")).toBeTruthy()
      })

      expect(screen.queryByRole("heading", { name: "Event Total", hidden: true })).toBeNull()
      expect(screen.queryByText(/^Grand Total/)).toBeNull()
      expect(screen.getByRole("heading", { name: "Per Person", hidden: true })).toBeTruthy()
      expect(screen.getByText("$60.04 – $60.59")).toBeTruthy()
    })

    it("prints one per-person price when everything is priced per person", async () => {
      mockBuffetEvent({ minGuests: 80, maxGuests: 120 })
      hooksMock.useFoodSection.mockReturnValue({
        data: [
          {
            id: "dinner",
            title: "Dinner",
            foodItems: [{ id: "d1", name: "Buffet", quantity: null, unitPriceCents: 4500, pricingBasis: "per_person" }],
          },
        ],
      })
      renderFinancial(withPricing(false, true))

      await waitFor(() => {
        expect(screen.getByText("Event Estimate")).toBeTruthy()
      })

      // 4500 + HST 585 + gratuity 810
      expect(screen.getByText("Per Person Total")).toBeTruthy()
      expect(screen.getByText("$58.95")).toBeTruthy()
    })

    it("asks for a guest count before it can price per person", async () => {
      mockBuffetEvent({ minGuests: null, maxGuests: null })
      renderFinancial(withPricing(false, true))

      await waitFor(() => {
        expect(screen.getByText("Event Estimate")).toBeTruthy()
      })

      expect(screen.getByText("Per-person pricing appears once the event has a guest count.")).toBeTruthy()
    })
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

    function packageState(mode: FoodPackageEstimateMode, showPerPersonPricing = false): PreviewPreferencesState {
      const state = createInitialPreviewPreferences()
      return {
        ...state,
        "financial-report": {
          ...state["financial-report"],
          showPerPersonPricing,
          showFoodPackages: true,
          foodPackageTimeblockIds: ["pkg-a", "pkg-b"],
          foodPackageEstimateMode: mode,
        },
        defaultsApplied: { ...state.defaultsApplied, financialFoodPackages: true },
      }
    }

    it("quotes a package at its set price per person, with platters as fixed-price items", async () => {
      mockPackageEvent()
      hooksMock.useFoodSection.mockReturnValue({
        data: [
          {
            id: "pkg-a",
            title: "Option A",
            packagePricePerPersonCents: 5500,
            foodItems: [
              { id: "a1", name: "Chicken", quantity: null, unitPriceCents: null, pricingBasis: "per_person" },
              { id: "a2", name: "Wings platter", quantity: 2, unitPriceCents: 10000, pricingBasis: "each" },
            ],
          },
          { id: "pkg-b", title: "Option B", foodItems: [{ id: "b1", name: "Steak", quantity: 20, unitPriceCents: 3000 }] },
        ],
      })
      renderFinancial(packageState("list"))

      await waitFor(() => {
        expect(screen.getByText("Food Packages")).toBeTruthy()
      })

      expect(screen.getByText("$55.00 per person + fixed-price items")).toBeTruthy()
      expect(screen.getByText("Included")).toBeTruthy()
      expect(screen.getByText("Fixed price, regardless of guest count")).toBeTruthy()
      // The cards follow the estimate's pricing views: package totals only by default.
      expect(screen.queryByText("Per person (10–20 guests)")).toBeNull()
      // Option A: 20000 + 5500 × 10 = 75000 up to 20000 + 5500 × 20 = 130000
      expect(screen.getAllByText("$750.00 – $1,300.00").length).toBeGreaterThan(0)
    })

    it("lists each package and shows the grand total as a range", async () => {
      mockPackageEvent()
      renderFinancial(packageState("list", true))

      await waitFor(() => {
        expect(screen.getByText("Food Packages")).toBeTruthy()
      })

      // Once in the Event Total section and once in the Per Person section.
      expect(screen.getAllByText("Food package option: Option A")).toHaveLength(2)
      expect(screen.getAllByText("Food package option: Option B")).toHaveLength(2)
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

      expect(screen.getByText("Food packages (2)")).toBeTruthy()
      expect(screen.getByText("Priced separately, see Food Packages")).toBeTruthy()
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
