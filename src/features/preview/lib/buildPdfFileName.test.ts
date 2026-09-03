import { describe, expect, it } from "vitest"

import {
  buildPdfFileName,
  extractClientLastName,
  formatPdfDate,
  getPdfDocumentType,
  sanitizeFileNameSegment,
} from "./buildPdfFileName"

describe("formatPdfDate", () => {
  it("formats a date as mm.dd.yyyy", () => {
    expect(formatPdfDate(new Date(2026, 8, 3))).toBe("09.03.2026")
    expect(formatPdfDate(new Date(2026, 0, 12))).toBe("01.12.2026")
  })
})

describe("extractClientLastName", () => {
  it("returns the last whitespace-separated token", () => {
    expect(extractClientLastName("John Smith")).toBe("Smith")
    expect(extractClientLastName("Mary Jane Craig")).toBe("Craig")
    expect(extractClientLastName("Carrie")).toBe("Carrie")
  })

  it("falls back to Client when missing or blank", () => {
    expect(extractClientLastName(null)).toBe("Client")
    expect(extractClientLastName(undefined)).toBe("Client")
    expect(extractClientLastName("   ")).toBe("Client")
  })
})

describe("getPdfDocumentType", () => {
  it("maps preview types to document labels", () => {
    expect(getPdfDocumentType("beo")).toBe("BEO")
    expect(getPdfDocumentType("beo-food")).toBe("BEO")
    expect(getPdfDocumentType("timeline")).toBe("Timeline")
    expect(getPdfDocumentType("financial-report")).toBe("Estimate")
  })
})

describe("sanitizeFileNameSegment", () => {
  it("removes unsafe filename characters", () => {
    expect(sanitizeFileNameSegment('Smith/Jones')).toBe("SmithJones")
    expect(sanitizeFileNameSegment('O"Brien')).toBe("OBrien")
  })

  it("falls back to Unknown when nothing remains", () => {
    expect(sanitizeFileNameSegment('/*?"')).toBe("Unknown")
  })
})

describe("buildPdfFileName", () => {
  const now = new Date(2026, 6, 28)

  it("builds a full BEO filename", () => {
    expect(
      buildPdfFileName({
        clientName: "John Smith",
        startDateTime: "2026-08-16T12:00:00.000Z",
        previewType: "beo",
        now,
      }),
    ).toBe("07.28.2026_Smith_BEO_08.16.2026.pdf")
  })

  it("builds a timeline filename", () => {
    expect(
      buildPdfFileName({
        clientName: "Jane Craig",
        startDateTime: "2026-09-12T12:00:00.000Z",
        previewType: "timeline",
        now: new Date(2026, 8, 3),
      }),
    ).toBe("09.03.2026_Craig_Timeline_09.12.2026.pdf")
  })

  it("builds an estimate filename for financial reports", () => {
    expect(
      buildPdfFileName({
        clientName: "Carrie",
        startDateTime: "2027-01-12T12:00:00.000Z",
        previewType: "financial-report",
        now: new Date(2026, 9, 16),
      }),
    ).toBe("10.16.2026_Carrie_Estimate_01.12.2027.pdf")
  })

  it("uses Client and Undated fallbacks when data is missing", () => {
    expect(
      buildPdfFileName({
        clientName: null,
        startDateTime: null,
        previewType: "beo",
        now,
      }),
    ).toBe("07.28.2026_Client_BEO_Undated.pdf")
  })
})
