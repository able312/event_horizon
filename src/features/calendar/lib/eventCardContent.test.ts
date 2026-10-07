import { describe, expect, it } from "vitest"
import {
  buildEventCardAccessibleName,
  describeGuestCount,
  formatGuestCount,
  getGuestCountRange,
} from "./eventCardContent"

describe("getGuestCountRange", () => {
  it("returns a range for estimated counts", () => {
    expect(getGuestCountRange({ minGuests: 20, maxGuests: 30, guestCountFinal: 0 })).toEqual({ min: 20, max: 30 })
  })

  it("uses the max field as a single number when the count is final", () => {
    expect(getGuestCountRange({ minGuests: 20, maxGuests: 40, guestCountFinal: 1 })).toEqual({ min: 40, max: 40 })
  })

  it("falls back to the min field for a final count with no max", () => {
    expect(getGuestCountRange({ minGuests: 40, maxGuests: null, guestCountFinal: 1 })).toEqual({ min: 40, max: 40 })
  })

  it("uses whichever bound exists for estimated counts", () => {
    expect(getGuestCountRange({ minGuests: null, maxGuests: 50, guestCountFinal: 0 })).toEqual({ min: 50, max: 50 })
    expect(getGuestCountRange({ minGuests: 50, maxGuests: 0, guestCountFinal: null })).toEqual({ min: 50, max: 50 })
  })

  it("orders reversed bounds", () => {
    expect(getGuestCountRange({ minGuests: 150, maxGuests: 120, guestCountFinal: 0 })).toEqual({ min: 120, max: 150 })
  })

  it("returns null when the count is unknown or zero", () => {
    expect(getGuestCountRange({ minGuests: null, maxGuests: null, guestCountFinal: 0 })).toBeNull()
    expect(getGuestCountRange({ minGuests: 0, maxGuests: 0, guestCountFinal: 1 })).toBeNull()
  })
})

describe("formatGuestCount", () => {
  it("shows a single number or an en dash range without spaces", () => {
    expect(formatGuestCount({ min: 40, max: 40 })).toBe("40")
    expect(formatGuestCount({ min: 20, max: 30 })).toBe("20–30")
  })
})

describe("describeGuestCount", () => {
  it("spells out counts for screen readers", () => {
    expect(describeGuestCount({ min: 1, max: 1 })).toBe("1 guest")
    expect(describeGuestCount({ min: 40, max: 40 })).toBe("40 guests")
    expect(describeGuestCount({ min: 120, max: 150 })).toBe("120 to 150 guests")
  })
})

describe("buildEventCardAccessibleName", () => {
  it("reads status, title, client, then guest count", () => {
    expect(
      buildEventCardAccessibleName({
        statusLabel: "New lead",
        title: "Henderson–Park Wedding",
        clientName: "Maya Henderson",
        guestCount: { min: 120, max: 150 },
      }),
    ).toBe("New lead: Henderson–Park Wedding, Maya Henderson, 120 to 150 guests")
  })

  it("skips missing client and guest count", () => {
    expect(buildEventCardAccessibleName({ statusLabel: "Confirmed", title: "Gala", clientName: "  " })).toBe(
      "Confirmed: Gala",
    )
  })

  it("mentions a missing Google Calendar upload last", () => {
    expect(
      buildEventCardAccessibleName({ statusLabel: "Tentative", title: "Gala", notUploadedToGoogleCalendar: true }),
    ).toBe("Tentative: Gala, not uploaded to Google Calendar")
  })
})
