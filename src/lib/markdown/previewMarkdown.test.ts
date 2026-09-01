import { describe, expect, it } from "vitest"

import {
  hasLegacyHeadingSyntax,
  migrateLegacyHeadingSyntax,
} from "./legacyMarkdownMigration"
import { parseInlines, parsePreviewMarkdown } from "./previewMarkdown"

describe("parsePreviewMarkdown", () => {
  it("returns an empty array for blank input", () => {
    expect(parsePreviewMarkdown("")).toEqual([])
    expect(parsePreviewMarkdown("   \n\n  ")).toEqual([])
  })

  it("parses h1 and h2 headings", () => {
    expect(parsePreviewMarkdown("# Main Title")).toEqual([
      {
        type: "heading",
        level: 1,
        inlines: [{ text: "Main Title" }],
      },
    ])

    expect(parsePreviewMarkdown("## Subtitle")).toEqual([
      {
        type: "heading",
        level: 2,
        inlines: [{ text: "Subtitle" }],
      },
    ])
  })

  it("parses bold, italic, and bold+italic inline styles", () => {
    expect(parsePreviewMarkdown("This is **bold** text.")).toEqual([
      {
        type: "paragraph",
        lines: [[
          { text: "This is " },
          { text: "bold", bold: true },
          { text: " text." },
        ]],
      },
    ])

    expect(parsePreviewMarkdown("This is *italic* text.")).toEqual([
      {
        type: "paragraph",
        lines: [[
          { text: "This is " },
          { text: "italic", italic: true },
          { text: " text." },
        ]],
      },
    ])

    expect(parsePreviewMarkdown("This is ***bold and italic*** text.")).toEqual([
      {
        type: "paragraph",
        lines: [[
          { text: "This is " },
          { text: "bold and italic", bold: true, italic: true },
          { text: " text." },
        ]],
      },
    ])
  })

  it("parses horizontal rules", () => {
    expect(parsePreviewMarkdown("---")).toEqual([{ type: "hr" }])
    expect(parsePreviewMarkdown("***")).toEqual([{ type: "hr" }])
  })

  it("parses unordered lists with * and - markers", () => {
    expect(parsePreviewMarkdown("* First\n* Second")).toEqual([
      {
        type: "list",
        ordered: false,
        items: [
          [{ text: "First" }],
          [{ text: "Second" }],
        ],
      },
    ])

    expect(parsePreviewMarkdown("- First\n- Second")).toEqual([
      {
        type: "list",
        ordered: false,
        items: [
          [{ text: "First" }],
          [{ text: "Second" }],
        ],
      },
    ])
  })

  it("parses ordered lists", () => {
    expect(parsePreviewMarkdown("1. First\n2. Second")).toEqual([
      {
        type: "list",
        ordered: true,
        items: [
          [{ text: "First" }],
          [{ text: "Second" }],
        ],
      },
    ])
  })

  it("splits blocks on blank lines and preserves single line breaks in paragraphs", () => {
    expect(parsePreviewMarkdown("# Title\n\nLine one\nLine two\n\n* Item")).toEqual([
      {
        type: "heading",
        level: 1,
        inlines: [{ text: "Title" }],
      },
      {
        type: "paragraph",
        lines: [
          [{ text: "Line one" }],
          [{ text: "Line two" }],
        ],
      },
      {
        type: "list",
        ordered: false,
        items: [[{ text: "Item" }]],
      },
    ])
  })

  it("parses mixed inline styles inside list items", () => {
    expect(parsePreviewMarkdown("* **Bold** item\n* *Italic* item")).toEqual([
      {
        type: "list",
        ordered: false,
        items: [
          [
            { text: "Bold", bold: true },
            { text: " item" },
          ],
          [
            { text: "Italic", italic: true },
            { text: " item" },
          ],
        ],
      },
    ])
  })

  it("parses a heading followed by body lines without a blank line", () => {
    expect(parsePreviewMarkdown("# Details\n24 Players\nScramble")).toEqual([
      {
        type: "heading",
        level: 1,
        inlines: [{ text: "Details" }],
      },
      {
        type: "paragraph",
        lines: [
          [{ text: "24 Players" }],
          [{ text: "Scramble" }],
        ],
      },
    ])
  })

  it("treats plain text as a paragraph", () => {
    expect(parsePreviewMarkdown("Just a note.")).toEqual([
      {
        type: "paragraph",
        lines: [[{ text: "Just a note." }]],
      },
    ])
  })
})

describe("parseInlines", () => {
  it("returns a single empty span for empty text", () => {
    expect(parseInlines("")).toEqual([{ text: "" }])
  })

  it("leaves unmatched markers as plain text", () => {
    expect(parseInlines("**unclosed")).toEqual([
      { text: "**" },
      { text: "unclosed" },
    ])
    expect(parseInlines("*unclosed")).toEqual([
      { text: "*" },
      { text: "unclosed" },
    ])
  })
})

describe("migrateLegacyHeadingSyntax", () => {
  it("swaps legacy heading prefixes", () => {
    const legacy = "## Details\n# Setup Notes\nPlain line"
    expect(migrateLegacyHeadingSyntax(legacy)).toBe(
      "# Details\n## Setup Notes\nPlain line",
    )
  })

  it("detects legacy heading syntax", () => {
    expect(hasLegacyHeadingSyntax("## Details")).toBe(true)
    expect(hasLegacyHeadingSyntax("# Details")).toBe(true)
    expect(hasLegacyHeadingSyntax("Plain text")).toBe(false)
  })
})
